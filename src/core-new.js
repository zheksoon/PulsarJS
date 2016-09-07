var globalCallStack = [];
var globalCallStackLength = 0;

function ObservableBase() {}

ObservableBase.prototype = {
	cleanupAndNotifySubscribers: function cleanupAndNotifySubscribers(notify) {
		var subscribersLastIndex = this.subscribersLastIndex
		var subscribers = this.subscribers;
		for (var i = 0, j = 0; j < subscribersLastIndex; j++) {
			var subscriber = subscribers[j];
			var notified = true;
			if (subscriber) {
				if (notify && !subscriber.isDirty)
					notified = subscriber.notifyUpdate(this);
				if (notified && i < j) {
					subscribers[i] = subscriber;
					this.subscribersIndexes[i] = this.subscribersIndexes[j];
					subscriber.notifyIndexUpdate(this.subscribersIndexes[j], i);
				}
				i++;
			}
		}
		this.subscribersLastIndex = this.subscribersCount = i;
		if (i > 0) {
			subscribers.length = i;
			// while (i < subscribersLastIndex) {
			// 	subscribers[i++] = null;
			// }
			return true;
		} else {
			return false;
		}
	},
	addAndCleanupSubscribers: function addAndCleanupSubscribers() {
	    var globalCallStackLength = globalCallStack.length;
	    if (globalCallStackLength > 0) {
	    	var subscriber = globalCallStack[globalCallStackLength - 1];
	    	var subscribersLastIndex = this.subscribersLastIndex;
	    	if (subscribersLastIndex > 3 && this.subscribersCount > 2 * subscribersLastIndex)
	    		this.cleanupAndNotifySubscribers(false);
	    	var index = subscriber.subscribe(this, subscribersLastIndex);
	    	if (index > 0) {
		    	this.subscribers[subscribersLastIndex] = subscriber;
		    	this.subscribersIndexes[this.subscribersLastIndex++] = index;
		    	this.subscribersCount++;
		    }
	    }
	}
}

function Observable(value) {
	this.value = value;
	this.subscribers = [null, null]
	this.subscribersIndexes = [0, 0]
	this.subscribersLastIndex = 0;
	this.subscribersCount = 0;
}

Observable.prototype = new ObservableBase();

Observable.prototype.get = function() {
	this.addAndCleanupSubscribers();
    return this.value;
}

Observable.prototype.unsubscribe = function(index) {
	this.subscribers[index] = null;
	this.subscribersCount--;
}

Observable.prototype.set = function(value) {
	this.value = value;
	this.cleanupAndNotifySubscribers(true);
}

function Computable(computer) {
	this.value = undefined;
	this.subscribers = [null, null];
	this.subscribersIndexes = [0, 0];
	this.subscribersLastIndex = 0;
	this.subscribersCount = 0;
	this.computer = computer;
	this.isDirty = true;
	this.subscriptions = [null, null];
	this.subscriptionsIndexes = [0, 0];
	this.subscriptionsLastIndex = 0;
}

Computable.prototype = new ObservableBase();

Computable.prototype.get = function() {
	this.addAndCleanupSubscribers();
	if (this.isDirty) {
		globalCallStack.push(this);
		var oldSubscriptionsCount = this.subscriptionsLastIndex;
		this.subscriptionsLastIndex = 0;
		this.value = this.computer();
		while (oldSubscriptionsCount > this.subscriptionsLastIndex) {
			this.subscriptions[--oldSubscriptionsCount] = null;
		}
		// resize subscription array here...
		// or it will only grow
		this.isDirty = false;
		globalCallStack.pop();
	}
	return this.value;
}

Computable.prototype.unsubscribe = function(index) {
	this.subscribers[index] = null;
	this.subscribersCount--;
	if (this.subscribersCount === 0) {
		this.unsubscribeSelf();
	}
}

Computable.prototype.unsubscribeSelf = function() {
	var subscriptions = this.subscriptions;
	for (var i = 0; i < this.subscriptionsLastIndex; i++) {
		subscriptions[i].unsubscribe(this.subscriptionsIndexes[i]);
		subscriptions[i] = null;
	}
	this.subscriptionsLastIndex = 0;
	this.isDirty = true;
}

Computable.prototype.subscribe = function(to, index) {
	var subscriptions = this.subscriptions;
	var subscriptionsLastIndex = this.subscriptionsLastIndex;
	if (subscriptionsLastIndex >= subscriptions.length || 
		subscriptions[subscriptionsLastIndex] !== to) 
	{
		subscriptions[subscriptionsLastIndex] = to;
		this.subscriptionsIndexes[subscriptionsLastIndex] = index;
		return this.subscriptionsLastIndex++;
	} else {
		this.subscriptionsLastIndex++;
		return -1;
	}
}

Computable.prototype.notifyUpdate = function(from) {
	this.isDirty = true;
	if (!this.cleanupAndNotifySubscribers(true)) {
		this.unsubscribeSelf();
		return false;
	}
	return true;
}

Computable.prototype.notifyIndexUpdate = function(from, to) {
	this.subscriptionsIndexes[from] = to;
}

function Reaction(runner) {
	this.runner = runner;
	this.parent = null;
	this.revision = 0;
	this.parentRevision = 0;
	this.subscriptions = [null, null];
	this.subscriptionsIndexes = [0, 0];
	this.subscriptionsLastIndex = 0;
	this.transactionRevision = 0;
	this.isLeading = false;
	this.isDirty = true;
	this.isAbandoned = false;
}

Reaction.prototype = {
	run: function() {
		if (globalCallStack.length > 0) {
			var parent = globalCallStack[globalCallStack.length - 1];
			this.parent = parent;
			this.parentRevision = parent.revision;
		}
		globalCallStack.push(this);
		var oldSubscriptionsCount = this.subscriptionsLastIndex;
		this.subscriptionsLastIndex = 0;
		this.value = this.computer();
		while (oldSubscriptionsCount > this.subscriptionsLastIndex) {
			this.subscriptions[--oldSubscriptionsCount] = null;
		}
		// resize subscription array here...
		// or it will only grow
		this.isDirty = false;
		globalCallStack.pop();
	},
	notifyUpdate: function(from) {
		this.isDirty = true;
		globalReactionList.push(this);
	},
	notifyIndexUpdate: function(from, to) {
		this.subscriptionsIndexes[from] = to;
	},
	subscribe: function(to, index) {
		var subscriptions = this.subscriptions;
		var subscriptionsLastIndex = this.subscriptionsLastIndex;
		if (subscriptionsLastIndex >= subscriptions.length || 
			subscriptions[subscriptionsLastIndex] !== to) 
		{
			subscriptions[subscriptionsLastIndex] = to;
			this.subscriptionsIndexes[subscriptionsLastIndex] = index;
			return this.subscriptionsLastIndex++;
		} else {
			this.subscriptionsLastIndex++;
			return -1;
		}
	},
	unsubscribeSelf: function() {
		var subscriptions = this.subscriptions;
		for (var i = 0; i < this.subscriptionsLastIndex; i++) {
			subscriptions[i].unsubscribe(this.subscriptionsIndexes[i]);
			subscriptions[i] = null;
		}
		this.subscriptionsLastIndex = 0;
		this.isDirty = true;
	},
}