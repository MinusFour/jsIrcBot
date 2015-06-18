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
var queue = {
	_msgList : [ ],
	_counter : 0
};

queue._startWatcher = function(){
	this._watcher = setInterval((function(self){
		return function(){
			self._counter = 0;
		}
	})(this), 1000);
}

queue._addToQueue = function(msg){
	this._msgList.push(msg);
	if(!this._queueInterval){
		this._intervalInit();
	}
}

queue._intervalInit = function(){
	this._queueInterval = setInterval((function(self){
		return function(){
			if(self._msgList.length > 0){
				self._sendMessage(self._msgList.shift());
			} else {
				clearInterval(self._queueInterval);
				self._queueInterval = null;
			}
		}
	})(this), 1000);
}

queue._sendMessage = function(msg){
	this._connection.write(msg);
}

queue.stopWatcher = function(){
	clearInterval(this._watcher);
}

queue.write = function(msg){
	if(this._counter > 3 || this._queueInterval){
		this._addToQueue(msg);
	} else {
		this._sendMessage(msg);
		this._counter++;
	}
}

queue.setConn = function(conn){
	this._connection = conn;
	this._startWatcher();
}

module.exports = queue;
