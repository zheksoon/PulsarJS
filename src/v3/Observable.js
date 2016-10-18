
var HashSet = require('./HashSet');

/* Constants */

var MIN_SUBSCRIPTIONS_COUNT_BY_2 = 4 * 2;

var DEBUG = false;

/* Global variables */

var gCallStack = [undefined];
var gCallStackDepth = 0;
var gTransactionDepth = 0;
var gTransactionId = 0;
var gScheduledReactions = [undefined];
var gScheduledReactionsCount = 0;


/* Helpers */

function random() {
    return (Math.random() * 0x3FFFFFFF) | 0;
}

// Xorshift random
// var x = (Math.random() * 0x3FFFFFFF) | 0;
// var y = (Math.random() * 0x3FFFFFFF) | 0;
// var z = (Math.random() * 0x3FFFFFFF) | 0;
// var w = (Math.random() * 0x3FFFFFFF) | 0;
// var x = 1215234;
// var y = 981293;
// var z = 684631684;
// var w = 319851236;
// function random() {
//     var t = x;
//     t ^= t << 11;
//     t ^= t >> 8;
//     x = y; y = z; z = w;
//     w ^= w >> 19;
//     w ^= t;
//     return w;
// }

function removeSubscriptions(notifier, resize) {
    var subscriptions = this._subscriptions;
    for (var i = 0; i < this._subscriptionsCount; i++) {
        if (subscriptions[i] !== notifier) {
            subscriptions[i].unsubscribe(this);
        }
        subscriptions[i] = undefined;
    }
    if (resize) {
        var subscriptionsLength = subscriptions.length;
        if (subscriptionsLength > MIN_SUBSCRIPTIONS_COUNT_BY_2 && 
            subscriptionsLength > this._subscriptionsCount * 4) {
            subscriptions.length = subscriptionsLength >> 1;
        }    
    }
    this._subscriptionsCount = 0;
}

function notifyAndRemoveSubscribers() {
    var subscribers = this._subscribers;
    if (subscribers.size() > 0) {
        /* 
            HashSet.forEach inlined, see it for details of the magic, equivalent of 
                subscribers.forEach((item) => item.notify());
            but with inplace item removal
        */
        var items = subscribers.items();
        var length = items.length - 1;
        var i = length;
        while (items[i] === undefined) i = (i - 1) & length;
        while (items[i] !== undefined) i = (i + 1) & length;
        for (var j = (i - 1) & length; j !== i; j = (j - 1) & length) {
            if (items[j] !== undefined) {
                var item = items[j];
                items[j] = undefined;
                item.notify(this);       
            }
        }
        subscribers.resize();
        subscribers.setSize(0);
    }
}

function addSubscriber(subscriber) {
    if (gCallStackDepth > 0) {
        var subscriber = gCallStack[gCallStackDepth - 1];
        var subscribers = this._subscribers;
        if (subscribers.add(subscriber)) {
            subscriber.subscribe(this);
        }
    }
}

/* Observable value */ 

function Observable(value, name) {
    this._hash = random();
    this._name = name;    
    this._value = value;
    this._subscribers = new HashSet();
}

Observable.prototype.get = function() {
    if (DEBUG) {
        console.log(`getting observable ${this._name}...`);
    }
    this._addSubscriber();
    return this._value;
}

Observable.prototype.set = function(value) {
    if (DEBUG) {
        console.log(`setting observable ${this._name} to ${value}...`);
    }
    this._value = value;
    this._notifyAndRemoveSubscribers();

    if (gTransactionDepth === 0) {
        runReactions();
    }
}

Observable.prototype.unsubscribe = function(subscriber) {
    if (DEBUG) {
        console.log(`unsubscribing observable ${this._name} from ${subscriber._name}`);
    }
    this._subscribers.remove(subscriber);
}

Observable.prototype._addSubscriber = addSubscriber;
Observable.prototype._notifyAndRemoveSubscribers = notifyAndRemoveSubscribers;

/* Computable value */

function Computable(computer, name) {
    this._hash = random();
    this._name = name;
    this._value = undefined;
    this._subscribers = new HashSet();
    this._subscriptions = [undefined];
    this._subscriptionsCount = 0;
    this._computer = computer;
    this._isDirty = true;
}

Computable.prototype.get = function() {
    if (DEBUG) {
        console.log(`getting computable ${this._name}${this._isDirty ? " (dirty)" : ""}...`);
    }
    this._addSubscriber();

    if (this._isDirty) {
        gCallStack[gCallStackDepth++] = this;
        this._value = this._computer();
        gCallStack[gCallStackDepth--] = undefined;

        this._isDirty = false;
    }
    return this._value;
}

Computable.prototype.notify = function(notifier) {
    if (DEBUG) {
        console.log(`notifying computable ${this._name} from ${notifier._name}...`);
    }
    this._isDirty = true;
    this._removeSubscriptions(notifier, true);
    this._notifyAndRemoveSubscribers();
}

Computable.prototype.unsubscribe = function(subscriber) {
    if (DEBUG) {
        console.log(`unsubscribing computable ${this._name} from ${subscriber._name}...`);
    }
    this._subscribers.remove(subscriber);

    if (this._subscribers.size() === 0) {
        this._isDirty = true;
        this._removeSubscriptions(undefined, false);
    }
}

Computable.prototype.subscribe = function(subscription) {
    if (DEBUG) {
        console.log(`subscribing ${this._name} to ${subscription._name}...`);
    }
    this._subscriptions[this._subscriptionsCount++] = subscription;
}

Computable.prototype._addSubscriber = addSubscriber;
Computable.prototype._notifyAndRemoveSubscribers = notifyAndRemoveSubscribers;
Computable.prototype._removeSubscriptions = removeSubscriptions;

/* Reaction */

function Reaction(reaction, name) {
    this._hash = random();
    this._name = name;    
    this._reaction = reaction;
    this._parent = null;
    this._subscriptions = [undefined];
    this._subscriptionsCount = 0;
    this._isDirty = false;

    this.run();
}

Reaction.prototype.run = function() {
    if (DEBUG) {
        console.log(`running reaction ${this._name}...`);
    }
    this._isDirty = false;

    if (gCallStackDepth > 0) {
        var parent = gCallStack[gCallStackDepth - 1];
        if (this._parent === null) {
            this._parent = parent;
            parent.subscribe(this);
        }
    }

    gCallStack[gCallStackDepth++] = this;
    this._reaction();
    gCallStack[gCallStackDepth--] = undefined;
}

Reaction.prototype.notify = function(notifier) {
    if (DEBUG) {
        console.log(`notifying reaction ${this._name} from ${notifier._name}...`);
    }
    this._isDirty = true;
    this._removeSubscriptions(notifier, true);
    gScheduledReactions[gScheduledReactionsCount++] = this;
}

Reaction.prototype.unsubscribe = function(subscriber) {
    if (DEBUG) {
        console.log(`unsubscribing reaction ${this._name} from ${subscriber._name}...`);
    }
    this._isDirty = false;
    this._removeSubscriptions(undefined, false);
}

Reaction.prototype.subscribe = function(subscription) {
    if (DEBUG) {
        console.log(`subscribing reaction ${this._name} to ${subscription._name}...`);
    }
    this._subscriptions[this._subscriptionsCount++] = subscription;
}

Reaction.prototype._removeSubscriptions = removeSubscriptions;

/* Functions */

function runReactions() {
    if (DEBUG) {
        console.log(`running ${gScheduledReactionsCount} reactions...`);
    }
    for (var i = 0; i < gScheduledReactionsCount; i++) {
        var reaction = gScheduledReactions[i];
        if (reaction._isDirty) {
            reaction.run();
        }
        gScheduledReactions[i] = undefined;
    }
    gScheduledReactionsCount = 0;
}

function transaction(transactionBody) {
    ++gTransactionDepth;
    transactionBody();
    if (--gTransactionDepth === 0) {
        runReactions();
    }
}

module.exports = {
    Observable: Observable,
    Computable: Computable,
    Reaction: Reaction,
    transaction: transaction,
}