/*******************************************************************************/
/* Javascript (nodeJs) Irc Bot
Copyright (C) 2015 Alejandro Quiroga

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
/*******************************************************************************/
var net = require('net');
var promise = require('./promise');
var queue = require('./queue');
var waiter = require('./mwaiting');
var styler = require('./styler');
var client = { };
var eventListeners = { };
var connection;
var joinedChannels = [ ];
var userList = [ ];
var accessList = [ ];
var accessListResolved = [ ];
var commands = [ ];
var commandsByName = [ ];
var authChecks = [ ];
var authenticated = [ ];
//RegExpresions:
var identReg = /^:([^-][\w_\-\\\[\]\{\}\^`\|]+)!~?([^-][\w_\-\\\[\]\{\}\^`\|]+)@([\w\/.\-]+\s)/;
var pingReg = /^PING\s(.*)/;
var privmsgReg = /^(?:PRIVMSG|NOTICE)\s([\w\[\]#]+)\s:(.*)/;
var serverReg = /^:[\w\.]+\s\d{3}\s[^-][\w_\-\\\[\]\{\}\^`\|]+/;
var namesReg = /^@\s([\w\#]+)\s:(.*)/;
var joinReg = /^JOIN\s([\w\#]+)$/;
var kickReg = /^KICK\s([\w\#]+)\s([^-][\w_\-\\\[\]\{\}\^`\|]+)/;
addAccess('default');

function initialHandshake(){
		sendMessage(connection, 'USER ' + client.user + ' localhost ' + client.host + ' :' + client.name);
		sendMessage(connection, 'NICK ' + client.user);
		trigger('login');
}

function dataLoop(data){
	data = data.replace(/\r\n$/,'');
	var ping = pingReg.exec(data);
	console.log(data);
	if(ping){
		sendMessage(connection, 'PONG ' + ping[1]);
	}
	var ident = identReg.exec(data);
	if(ident){
		var username = ident[1];
		var name = ident[2];
		var host = ident[3];
		var com = data.replace(identReg, '');
		var privmsg = privmsgReg.exec(com);
		var joinChannel = joinReg.exec(com);
		var kick = kickReg.exec(com);
		if(privmsg){
			var medium = privmsg[1];
			var msg = privmsg[2];
			if(waiter.isUserWaiting(username)){
				waiter.resolveWaitingFunction(username, msg);
			}
			if(isCommand(msg)){
				var access = checkAccess(username);
				msg = msg.substr(client.cSymbol.length);
				if(access == 'default' || isAuthenticated(username)){
					matchCommand(username, access, msg, medium);
				} else {
					if(!isAuthenticating(username)){
						authenticate(username, function() {
							matchCommand(username, access, msg, medium);
						});
					} else {
						sendNoticeTo(username, 'You are being authenticated, please be patient.');
					}
				}
			}
		} else if(joinChannel){
			if(username == client.user){
				joinedChannels.push(joinChannel[1]);
				trigger('botJoin', [joinChannel[1]]);
			} else {
				trigger('join', [username, joinChannel[1]]);
			}
		} else if(kick){
			var channel = kick[1];
			var user = kick[2];
			if(user == client.user){
				//They kicked the bot.
				trigger('botKick', [channel, username]);
			} else {
				trigger('kick', [channel, user]);
			}
		}
	}
}

function authenticate(user, cb){
	var authPromise = Object.create(promise);
	authPromise.make(user, function(user, cb){
		authenticated[user] = false;
		cb(true);
	}, function(){
		authenticated[user] = undefined;
		sendNoticeTo(user, 'Auth failed!');
	});
	//Chain functions
	authChecks.every(function(fn){
		authPromise = authPromise.then(fn);
	});

	authPromise.then(function(){
		authenticated[user] = true;
		sendNoticeTo(user, 'You are now authenticated!');
		cb();
	});
}

function isAuthenticating(user){
	return authenticated[user] === false;
}

function isAuthenticated(user){
	return authenticated[user] === true;
}

function isCommand(msg){
	if(msg.indexOf(client.cSymbol) == 0){
		return true;
	} else {
		return false;
	}
}

function getFullAccessList(access){
	if(accessListResolved[access] === undefined){
		accessListResolved[access] = resolveAccess(access);
	}
	return accessListResolved[access];
}

function getCommandsList(user){
	var access = checkAccess(user);
	var aList = getFullAccessList(access);
	var comms = [];
	aList.forEach(function(subaccess) {
		commands[subaccess].forEach(function(command){
			comms.push(command.name);
		}, this);
	}, this);
	return comms;
}

function listCommandsAsString(user){
	var comms = getCommandsList(user);
	var str = '';
	var separator = ' - ';
	comms.forEach(function(command){
		str += client.cSymbol + command + separator;
	}, this);
	str = str.substr(0, str.length - separator.length);
	return str;
}

function matchCommand(user, access, msg, medium){
	var aList = getFullAccessList(access);
	aList.forEach(function(subaccess){
		commands[subaccess].forEach(function(command){
			var result = command.regexp.exec(msg);
			if(result){
				result.push(user);
				result.push(medium);
				command.fn.apply(this, result.slice(1));
			}
		}, this);
	}, this);
}

function waitForNextMessageFrom(user, test, expire){
	return waiter.addWait(user, test, expire);
}

function resolveAccess(access){
	var list = [];
	list.push(access);
	if(accessList[access] !== undefined){
		accessList[access].forEach(function(subaccess){
			list = list.concat(resolveAccess(subaccess));
		}, this);
	}
	return list;
}

function checkAccess(username){
	for(user in userList){
		if(userList[user].user === username){
			return userList[user].access;
		}
	}
	return 'default';
}

function getHelpForCommand(command){
	var comm = commandsByName[command];
	if(comm !== undefined){
		if(comm.help !== undefined){
			return comm.help;
		} else {
			return 'No help found for command ' + command;
		}
	} else {
		return 'Command not found!';
	}
}

function addAccess(accessName, composedAccess){
	accessList[accessName] = composedAccess;
	commands[accessName] = [];
}

function addUser(username, access){
	userList.push({
		user: username,
		access: access
	});
}

function addAuthCheck(fn){
	authChecks.push(fn);
}

function sendMessage(connection, msg){
	console.log(msg);
	queue.write(msg + '\r\n');
}

function sendQueueMessage(connection, msg){
	//Signature needs to be fixed
	console.log(msg);
	queue.write(msg + '\r\n');
}

function trigger(event, params){
	if(eventListeners[event] !== undefined){
		eventListeners[event].forEach(function(cb){
			cb.apply(this, params);
		}, this);
	}
}

function addCommand(command, access){
	commandsByName[command.name] = command;
	commands[access].push(command);
}

function sendMessageToUser(user, msg){
	sendQueueMessage(connection, 'PRIVMSG ' + user + ' :' + msg);
}

function sendNoticeTo(medium, msg){
	sendQueueMessage(connection, 'NOTICE ' + medium + ' :' + msg);
}

function sendKick(user, channel, message){
	sendMessage(connection, 'KICK ' + channel + ' ' + user + ' :' + message);
}

client.start = function(options){
	if(options !== undefined){
		this.setOptions(options);
	}
	connection = net.connect(client.port, client.host);
	queue.setConn(connection);
	connection.setEncoding('utf8');
	connection.on('connect', initialHandshake);
	connection.on('data', dataLoop);
}

client.setOptions = function(options){
	for(key in options){
		client[key] = options[key];
	}
}

client.on = function(event, cb){
	if(eventListeners[event] === undefined){
		eventListeners[event] = [];
	}
	eventListeners[event].push(cb);
}

client.messageUser = function(user, msg){
	sendMessageToUser(user, msg);
}

client.color = function(text, fg, bg){
	return styler.color(text, fg, bg);
}

client.format = function(text, format){
	return styler.format(text, format);
}

client.sendNoticeOn = function(medium, msg){
	sendNoticeTo(medium, msg);
}

client.joinChannel = function(channel){
	sendMessage(connection, 'JOIN ' + channel);
}

client.getCommandHelp = function(command){
	return getHelpForCommand(command);
}

client.defineCommand = function(command, access){
	addCommand(command, access);
}

client.defineUser = function(user, access){
	addUser(user, access);
}

client.defineAccess = function(access, composed){
	addAccess(access, composed);
}

client.kickUser = function(user, channel, message){
	sendKick(user, channel, message);
}

client.quit = function(){
	sendMessage(connection, 'QUIT :Goodbye!');
}

client.waitFor = function(user, test, expire){
	return waitForNextMessageFrom(user, test, expire);
}

client.onAuth = function(fn){
	addAuthCheck(fn);
}

client.listCommandsFor = function(user){
	return listCommandsAsString(user);
}

module.exports = client;
