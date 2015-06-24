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
var promise = {};
promise.make = function (user, fn, fb) {
    this.fn = fn;
	this.fb = fb;
	this.user = user;
	this.fn(user, resolve.bind(this));
	return this;
};

function resolve(answer) {
	this.val = answer;
	this.status = 'resolved';
	if(!(this.val)){
		this.fb();
		this.status = 'failed';
	} else if(this.cb) {
		this.prom.make(this.user, this.cb, this.fb);
	}
}

promise.then = function (cb) {
    this.cb = cb;
	this.prom = Object.create(promise);
	if(this.status == 'resolved'){
		this.prom.make(this.user, this.cb, this.fb);
	}
	return this.prom;
};

module.exports = promise;
