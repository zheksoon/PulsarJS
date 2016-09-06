var globalCallStack = [];
var globalCallStackLength = 0;

function ObservableBase() {}

ObservableBase.prototype = {
	cleanupSubscribers: function cleanupSubscribers(notify) {
		var subscribersIndex = this.subscribersIndex
		var subscribers = this.subscribers;
		for (var i = 0, j = 0; j < subscribersIndex; j++) {
			var subscriber = subscribers[j];
			if (subscriber) {
				if (notify && !subscriber.isDirty)
					subscriber.notifyUpdate(this);
				if (i < j) {
					subscribers[i] = subscriber;
				}
				i++;
			}
		}
		this.subscribersIndex = this.subscribersCount = i;
		
		// simplify just for initial testing
		subscribers.length = i;
		// while (i < subscribersIndex) {
		// 	subscribers[i++] = null;
		// }
		// reduce array length here...	
	},
	addAndCleanupSubscribers: function addAndCleanupSubscribers() {
	    var globalCallStackLength = globalCallStack.length;
	    if (globalCallStackLength > 0) {
	    	var subscriber = globalCallStack[globalCallStackLength - 1];
	    	if (this.subscribersIndex > 3 && this.subscribersCount > 2 * this.subscribersIndex)
	    		this.cleanupSubscribers(false);
	    	subscriber.subscribe(this, this.subscribersIndex);
	    	this.subscribers[this.subscribersIndex++] = subscriber;
	    	this.subscribersCount++;
	    }
	}
}

function Observable(value) {
	this.value = value;
	this.subscribers = [null, null]
	this.subscribersIndex = 0;
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
	this.cleanupSubscribers(true);
}

function Computable(computer) {
	this.value = undefined;
	this.subscribers = [null, null];
	this.subscribersIndex = 0;
	this.subscribersCount = 0;
	this.computer = computer;
	this.isDirty = true;
	this.subscriptions = [null, null];
	this.subscriptionsIndexes = [0, 0];
	this.subscriptionsCount = 0;
}

Computable.prototype = new ObservableBase();

Computable.prototype.get = function() {
	this.addAndCleanupSubscribers();
	if (this.isDirty) {
		this.unsubscribeSelf();
		this.value = this.computer();
		// resize subscription array here...
		// or it will only grow
		this.isDirty = false;
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
	for (var i = 0; i < this.subscriptionsCount; i++) {
		subscriptions[i].unsubscribe(this.subscriptionsIndexes[i]);
		subscriptions[i] = null;
	}
	this.subscriptionsCount = 0;
}

Computable.prototype.subscribe = function(to, index) {
	this.subscriptions[this.subscriptionsCount] = to;
	this.subscriptionsIndexes[this.subscriptionsCount++] = index;
}

Computable.prototype.notifyUpdate = function(from) {
	this.isDirty = true;
}


function Reaction(runner) {
	this.runner = runner;
	this.parent = null;	// the only subscriber of the reaction
	this.subscriptions = [null, null];
	this.subscriptionsIndexes = [0, 0];
	this.transactionRevision = 0;
	this.isLeading = false;
}

Reaction.prototype = {

}