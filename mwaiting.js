var adehun = require('Adehun');
var mwaiting = {
	_waitingList : [ ]
}

mwaiting.addWait = function(user, test, expire){
	if(this._waitingList[user] === undefined){
		this._waitingList[user] = [];
	}
	var deferredP = adehun.deferred();
	var obj = { regexp : test, fn : deferredP.resolve };
	var index = this._waitingList[user].push(obj);
	var timeout = setTimeout((function(self){
		return function(){
			self._waitingList[user].splice(index - 1, 1);
			deferredP.reject('The message failed to arrive.');
		}
	})(this), expire);
	obj.timeout = timeout;
	return deferredP.promise;
}

mwaiting.isUserWaiting = function(user){
	if(this._waitingList[user] !== undefined && this._waitingList[user].length > 0){
		return true;
	} else {
		return false;
	}
}

mwaiting.resolveWaitingFunction = function(user, msg){
	var toDo = this._waitingList[user];
	var toDelete = [ ];
	toDo.forEach(function(action, index) {
		if(msg.match(action.regexp)){
				action.fn(msg);
				clearTimeout(action.timeout);
				toDelete.push(index);
		}
	}, this);
	if(toDelete.length){
		toDelete.sort(function(a, b){
			return b - a;
		}).forEach(function(value){
			toDo.splice(value, 1);
		});
	}
}

module.exports = mwaiting;
