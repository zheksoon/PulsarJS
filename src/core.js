/*
    YAO (Yet Another Observable)
*/
// (function() {
var globalCallStack = [];
var globalReactionList = new Array(15);
var globalReactionCount = 0;
var globalRevision = 0;
var globalTransactionRevision = 0;
var globalTransactionDepth = 0;

function resetGlobals() {
    globalRevision = 0;
    globalTransactionRevision = 0;
}

function globalNextRevision() {
    return globalRevision = (globalRevision + 1) | 0;
}

function isLeadingReaction(observer) {
    if (observer.transactionRevision !== globalTransactionRevision) {
        observer.transactionRevision = globalTransactionRevision;
        var observerOwner = observer.observer;
        if (observerOwner) {
            if (observerOwner.revision !== observerOwner.resultRevision || 
                observerOwner.revision !== observer.observerRevision ||
                !isLeadingReaction(observerOwner)) {
                return observer.isLeadingObserver = false;
            }
        }
        return observer.isLeadingObserver = true;
    } else {
        return observer.isLeadingObserver;
    }
}

function globalRunReactions() {
    globalTransactionRevision = globalNextRevision();
    for (var i = 0; i < globalReactionCount; i++) {
        var reaction = globalReactionList[i];
        globalReactionList[i] = null;
        if (isLeadingReaction(reaction)) {
            reaction.run();
        } else {
            reaction.resultRevision = reaction.revision; // simulate a run without a run
        }
    }
    if (globalReactionCount > 15 && (globalReactionList.length >> 1) > globalReactionCount) {
        globalReactionList.length = globalReactionCount;
    }
    globalReactionCount = 0;
}

function transaction(runner) {
    ++globalTransactionDepth;
    runner();
    if (--globalTransactionDepth === 0) {
        globalRunReactions();
    }
}

function ObservableBase() {}

ObservableBase.prototype = {
    addObserver: function() {
        var globalCallStackLength = globalCallStack.length;
        if (globalCallStackLength > 0) {
            var newObserver = globalCallStack[globalCallStackLength - 1];
            var observers = this.observers;
            var observersCount = this.observersCount;
            var observerRevisions = this.observerRevisions;
            if (observersCount > 0 && observers[observersCount - 1] === newObserver) {
                observerRevisions[observersCount - 1] = newObserver.revision;
            } else if (observersCount > 15 && (observersCount >> 1) > this.lastValidObserversCount) {
                var observer, observerRevision;
                for (var i = 0, j = 0; j < observersCount; j++) {
                    observer = observers[j];
                    observerRevision = observerRevisions[j];
                    if (observer.resultRevision === observerRevision) {
                        if (i < j) {
                            observers[i] = observer;
                            observerRevisions[i] = observerRevision;
                        }
                        i++;
                    }
                }
                if (i < observersCount) {
                    observers[i] = newObserver;
                    observerRevisions[i] = newObserver.revision;
                    this.lastValidObserversCount = this.observersCount = ++i;
                    if (i > 15 && (observers.length > i * 3)) {
                        var newObserverArrayLength = observers.length >> 1
                        observers.length = newObserverArrayLength;
                        observerRevisions.length = newObserverArrayLength;
                    }
                    while (i < observersCount) {
                        observers[i++] = null;
                    }
                } else {
                    observers[observersCount] = newObserver;
                    observerRevisions[observersCount] = newObserver.revision;
                    this.lastValidObserversCount = this.observersCount = observersCount + 1;
                }
            } else {
                observers[observersCount] = newObserver;
                observerRevisions[observersCount] = newObserver.revision;
                this.observersCount = observersCount + 1;
            }
        }
    },
    notifyAndCleanupObservers: function() {
        var observers = this.observers;
        var observerRevisions = this.observerRevisions;
        var observersCount = this.observersCount;
        var observer, observerRevision;
        for (var i = 0, j = 0; j < this.observersCount; j++) {  
            observer = observers[j];
            observerRevision = observerRevisions[j];
            if (observer.resultRevision === observerRevision) {
                if (observer.resultRevision === observer.revision) {
                    observer.notifyRevisionUpdate(this.revision);
                }
                if (i < j) {
                    observers[i] = observer;
                    observerRevisions[i] = observerRevision;
                }
                i++;
            }
        }
        if (i < observersCount) {
            this.lastValidObserversCount = this.observersCount = i;
            if (i > 15 && (observers.length > i * 3)) {
                var newObserverArrayLength = observers.length >> 1
                observers.length = newObserverArrayLength;
                observerRevisions.length = newObserverArrayLength;
            }
            while (i < observersCount) {
                observers[i++] = null;
            }
        }
    }
}

function Observable(value) {
    this.value = value;
    this.revision = globalNextRevision();
    this.observers = [null, null];
    this.observerRevisions = [0, 0];
    this.observersCount = 0;
    this.lastValidObserversCount = 0;
}

Observable.prototype = new ObservableBase();

Observable.prototype.get =  function() {
    this.addObserver();
    return this.value;
}

Observable.prototype.set = function(value) {
    this.value = value;
    this.revision = globalNextRevision();
    this.notifyAndCleanupObservers();
    if (globalTransactionDepth === 0)  {
        globalRunReactions();
    }
}

function observable(value) {
    return new Observable(value);
}

function Computable(thunk) {
    this.value = undefined;
    this.revision = globalNextRevision();
    this.observers = [null, null];
    this.observerRevisions = [0, 0];
    this.observersCount = 0;
    this.lastValidObserversCount = 0;
    this.resultRevision = 0;
    this.thunk = thunk;
}

Computable.prototype = new ObservableBase();

Computable.prototype.get = function() {
    this.addObserver();
    if (this.revision !== this.resultRevision) {
        globalCallStack.push(this);
        this.value = this.thunk();
        this.resultRevision = this.revision;
        globalCallStack.pop();
    }
    return this.value;
}

Computable.prototype.notifyRevisionUpdate = function(revision) {
    this.revision = revision;
    this.notifyAndCleanupObservers();  
}

function computable(thunk) {
    return new Computable(thunk);
}

function Observer(runner) {
    this.isLeadingObserver = false;
    this.revision = globalNextRevision();
    this.observer = null;
    this.observerRevision = null;
    this.transactionRevision = 0;
    this.resultRevision = 0;
    this.runner = runner;

    this.run();
}

Observer.prototype = {
    run: function() {
        var globalCallStackLength = globalCallStack.length;
        if (globalCallStackLength > 0) {
            var observer = globalCallStack[globalCallStackLength - 1];
            this.observer = observer
            this.observerRevision = observer.revision;
        }
        globalCallStack.push(this);
        var value = this.runner();
        this.resultRevision = this.revision;
        globalCallStack.pop();
        return value;
    },
    notifyRevisionUpdate: function(revision) {
        this.revision = revision;
        globalReactionList[globalReactionCount++] = this;
    }
}

function observer(runner) {
    return new Observer(runner);
}

module.exports = {
    resetGlobals: resetGlobals,
    Observable: Observable,
    Computable: Computable,
    observable: observable,
    computable: computable,
    Observer: Observer,
    observer: observer,
    transaction: transaction,
}

// })()