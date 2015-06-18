var queue = { };
var msgList = [ ];
var counter;
var queueInterval;
var connection;
var watcher = setInterval(function(){
	counter = 0;
}, 1000);

function addToQueue(msg){
	msgList.push(msg);
	if(!queueInterval){
		intervalInit();
	}
}

function intervalInit(){
	queueInterval = setInterval(function(){
		if(msgList.length > 0){
			sendMessage(msgList.shift());
		} else {
			clearInterval(queueInterval);
			queueInterval = null;
		}
	}, 1000);
}

function sendMessage(msg){
	connection.write(msg);
}

queue.stopWatcher = function(){
	clearInterval(watcher);
}

queue.write = function(msg){
	if(counter > 3 || queueInterval){
		addToQueue(msg);
	} else {
		sendMessage(msg);
		counter++;
	}
}

queue.setConn = function(conn){
	connection = conn;
}

module.exports = queue;
