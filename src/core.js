/*
    YAO (Yet Another Observable)
*/
// (function() {
var globalCallStack = [];
var globalReactionList = [];
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
    for (var i = 0; i < globalReactionList.length; i++) {
        var reaction = globalReactionList[i];
        if (isLeadingReaction(reaction)) {
            reaction.run();
        } else {
            reaction.resultRevision = reaction.revision; // simulate a run without a run
        }
    }
    globalReactionList.length = 0;
}

function transaction(runner) {
    ++globalTransactionDepth;
    runner();
    if (--globalTransactionDepth === 0) {
        globalRunReactions();
    }
}

function Observable(value) {
    this.value = value;
    this.revision = globalNextRevision();
    this.observers = [];
    this.observerRevisions = [];
    this.lastValidObserversCount = 0;

    this.get =  function() {
        this.addObserver();
        return this.value;
    }
    this.set = function(value) {
        this.value = value;
        this.revision = globalNextRevision();
        this.notifyAndCleanupObservers();
        if (globalTransactionDepth === 0)  {
            globalRunReactions();
        }
    }
}

Observable.prototype = {
    addObserver: function() {
        var globalCallStackLength = globalCallStack.length;
        if (globalCallStackLength > 0) {
            var newObserver = globalCallStack[globalCallStackLength - 1];
            var observers = this.observers;
            var lastObserverIndex = observers.length - 1;
            var observerRevisions = this.observerRevisions;
            if (lastObserverIndex >= 0 && observers[lastObserverIndex] === newObserver) {
                observerRevisions[lastObserverIndex] = newObserver.revision;
            } else if (lastObserverIndex >= 15 && (lastObserverIndex >> 1) > this.lastValidObserversCount) {
                var observer, observerRevision;
                for (var i = 0, j = 0; j <= lastObserverIndex; j++) {  
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
                if (i < j) {
                    observers[i] = newObserver;
                    observers.length = i + 1;
                    observerRevisions[i] = newObserver.revision;
                    observerRevisions.length = i + 1;
                    this.lastValidObserversCount = i + 1;
                } else {
                    observers.push(newObserver);
                    observerRevisions.push(newObserver.revision);
                    this.lastValidObserversCount = i;
                }
            } else {
                observers.push(newObserver);
                observerRevisions.push(newObserver.revision);    
            }
        }
    },
    notifyAndCleanupObservers: function() {
        var observers = this.observers;
        var observerRevisions = this.observerRevisions;
        var observersLength = observers.length
        var observer, observerRevision;
        for (var i = 0, j = 0; j < observersLength; j++) {  
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
        if (i < j) {
            observers.length = i;
            observerRevisions.length = i;
        }
        this.lastValidObserversCount = i;
    }
}


function observable(value) {
    return new Observable(value);
}

function Computable(thunk) {
    this.value = null;
    this.revision = globalNextRevision();
    this.observers = [];
    this.observerRevisions = [];
    this.lastValidObserversCount = 0;
    this.resultRevision = 0;
    this.thunk = thunk;

    this.get = function() {
        this.addObserver();
        if (this.revision !== this.resultRevision) {
            globalCallStack.push(this);
            this.value = this.thunk();
            this.resultRevision = this.revision;
            globalCallStack.pop();
        }
        return this.value;
    }
    this.notifyRevisionUpdate = function(revision) {
        this.revision = revision;
        this.notifyAndCleanupObservers();  
    }
}

Computable.prototype = Observable.prototype;

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
    
    this.run = function() {
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
    }
    this.notifyRevisionUpdate = function(revision) {
        this.revision = revision;
        globalReactionList.push(this);
    }

    this.run();
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