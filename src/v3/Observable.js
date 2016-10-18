
var HashSet = require('./HashSet');

/* Constants */

var MIN_SUBSCRIPTIONS_COUNT_BY_2 = 4 * 2;

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

/* Observable value */ 

function Observable(value, name) {
    this._name = name;
    this._hash = random();
    this._value = value;
    this._subscribers = new HashSet();
    this._isDirty = false;
}

Observable.prototype.get = function() {
    console.log(`getting observable ${this._name}...`);
    this._isDirty = false;

    if (gCallStackDepth > 0) {
        var subscriber = gCallStack[gCallStackDepth - 1];
        var subscribers = this._subscribers;
        if (subscribers.add(subscriber)) {
            subscriber.subscribe(this);
        }
    }
    return this._value;
}

Observable.prototype.set = function(value) {
    console.log(`setting observable ${this._name} to ${value}...`);
    this._isDirty = true;

    var subscribers = this._subscribers;
    if (subscribers.size() > 0) {
        var items = subscribers.items();
        for (var i = 0; i < items.length; i++) {
            if (items[i] !== undefined) {
                items[i].notify(this);
                items[i] = undefined;
            }
        }
        subscribers.setSize(0);
    }
    this._value = value;

    if (gTransactionDepth === 0) {
        runReactions();
    }
}

Observable.prototype.unsubscribe = function(subscriber) {
    console.log(`unsubscribing observable ${this._name} from ${subscriber._name}`);
    this._subscribers.remove(subscriber);
}

/* Computable value */

function Computable(computer, name) {
    this._name = name;
    this._hash = random();
    this._value = undefined;
    this._subscribers = new HashSet();
    this._subscriptions = [undefined];
    this._subscriptionsCount = 0;
    this._computer = computer;
    this._isDirty = true;
}

Computable.prototype.get = function() {
    console.log(`getting computable ${this._name}${this._isDirty ? " (dirty)" : ""}...`)
    if (gCallStackDepth > 0) {
        var subscriber = gCallStack[gCallStackDepth - 1];
        var subscribers = this._subscribers;
        if (subscribers.add(subscriber)) {
            subscriber.subscribe(this);
        }
    }
    if (this._isDirty) {
        gCallStack[gCallStackDepth++] = this;
        this._value = this._computer();
        gCallStack[gCallStackDepth--] = undefined;

        this._isDirty = false;
    }
    return this._value;
}

Computable.prototype.notify = function(notifier) {
    console.log(`notifying computable ${this._name}...`)
    this._isDirty = true;

    var subscriptions = this._subscriptions;
    for (var i = 0; i < this._subscriptionsCount; i++) {
        if (subscriptions[i] !== notifier) {
            subscriptions[i].unsubscribe(this);
        }
        subscriptions[i] = undefined;
    }
    var subscriptionsLength = subscriptions.length;
    if (subscriptionsLength > MIN_SUBSCRIPTIONS_COUNT_BY_2 && 
        subscriptionsLength > this._subscriptionsCount * 4) {
        subscriptions.length = subscriptionsLength >> 1;
    }    
    this._subscriptionsCount = 0;

    var subscribers = this._subscribers;
    if (subscribers.size() > 0) {
        var items = subscribers.items();
        for (var i = 0; i < items.length; i++) {
            if (items[i] !== undefined) {
                items[i].notify(this);
                items[i] = undefined;
            }
        }
        subscribers.setSize(0);
    }
}

Computable.prototype.unsubscribe = function(subscriber) {
    console.log(`unsubscribing computable ${this._name} from ${subscriber._name}...`);
    this._subscribers.remove(subscriber);

    if (this._subscribers.size() === 0) {
        var subscriptions = this._subscriptions;
        for (var i = 0; i < this._subscriptionsCount; i++) {
            subscriptions[i].unsubscribe(this);
            subscriptions[i] = undefined;
        }
        this._subscriptionsCount = 0;
    }
}

Computable.prototype.subscribe = function(subscription) {
    console.log(`subscribing ${this._name} to ${subscription._name}...`)
    this._subscriptions[this._subscriptionsCount++] = subscription;
}

/* Reactive function */

function Reactive(reaction, name) {
    this._name = name;
    this._hash = random();
    this._reaction = reaction;
    this._isDirty = false;
    this._subscriptions = [undefined];
    this._subscriptionsCount = 0;

    this.run();
}

Reactive.prototype.run = function() {
    console.log(`running reaction ${this._name}...`)
    this._isDirty = false;

    if (gCallStackDepth > 0) {
        var parent = gCallStack[gCallStackDepth - 1];
        parent.subscribe(this);
    }

    gCallStack[gCallStackDepth++] = this;
    this._reaction();
    gCallStack[gCallStackDepth--] = undefined;
}

Reactive.prototype.notify = function(notifier) {
    console.log(`notifying reaction ${this._name}...`);
    var subscriptions = this._subscriptions;
    for (var i = 0; i < this._subscriptionsCount; i++) {
        if (subscriptions[i] !== notifier) {
            subscriptions[i].unsubscribe(this);
        }
        subscriptions[i] = undefined;
    }
    var subscriptionsLength = subscriptions.length;
    if (subscriptionsLength > MIN_SUBSCRIPTIONS_COUNT_BY_2 && 
        subscriptionsLength > this._subscriptionsCount * 4) {
        subscriptions.length = subscriptionsLength >> 1;
    }    
    this._subscriptionsCount = 0;

    this._isDirty = true;

    gScheduledReactions[gScheduledReactionsCount++] = this;
}

Reactive.prototype.unsubscribe = function(subscriber) {
    console.log(`unsubscribing reaction ${this._name} from ${subscriber._name}...`)
    this._isDirty = false;

    var subscriptions = this._subscriptions;
    for (var i = 0; i < this._subscriptionsCount; i++) {
        subscriptions[i].unsubscribe(this);
        subscriptions[i] = undefined;
    }
}

Reactive.prototype.subscribe = function(subscription) {
    console.log(`subscribing reaction ${this._name} to ${subscription._name}...`);
    this._subscriptions[this._subscriptionsCount++] = subscription;
}

/* Functions */

function runReactions() {
    console.log(`running ${gScheduledReactionsCount} reactions...`)
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

/* test */
var a = new Observable(1, 'A');
var b = new Observable(2, 'B');
var c = new Computable(function() {
    return a.get() + b.get();
}, 'C');
var d = new Reactive(function() {
    console.log(`${a.get()} + ${b.get()} = ${c.get()}`);
}, 'D');
var e = new Computable(function() {
    return a.get() * a.get();
}, 'E')
var f = new Reactive(function() {
    console.log(`${a.get()}^2 = ${e.get()}`);
}, 'F')
a.set(5);
a.set(10);
a.set(20);
b.set(15);
transaction(function() {
    a.set(1);
    b.set(1);
})