var assert = require('assert');

var pulsar = require('../src/core');
var observable = pulsar.observable;
var computable = pulsar.computable;
var observer = pulsar.reaction;

describe('Observable', function() {
    beforeEach('Reset global counters', function() {
        pulsar.resetGlobals();
    })

    describe('#livecycle test', function() {
        it('creates an empty observable', function() {
            var o = observable();
            assert.equal(1, o.revision);
            assert.equal(undefined, o.get());
        });
        it('creates an observable with numeric value', function() {
            var o = observable(1);
            assert.equal(1, o.revision);
            assert.equal(1, o.get());
        });
        it('creates an observable and sets value', function() {
            var o = observable();
            o.set(1);
            assert.equal(2, o.revision);
            assert.equal(1, o.get());
        });
    });
    describe('#computable test', function() {
        it('creates computable', function() {
            var c = computable(function() {});
            assert.equal(1, c.revision);
            assert.equal(0, c.resultRevision);
            assert.equal(undefined, c.value);
            assert.equal(undefined, c.get());
        });
        it('creates computable that returns a number', function() {
            var c = computable(function() { return 1});
            assert.equal(1, c.revision);
            assert.equal(0, c.resultRevision);
            assert.equal(undefined, c.value);
            assert.equal(1, c.get());
            assert.equal(1, c.value);
        });
        it('creates computable that uses observable', function() {
            var o = observable(1);
            var c = computable(function() {return o.get() * 2});
            assert.equal(1, o.revision);
            assert.equal(2, c.revision);
            assert.equal(undefined, c.value);

            assert.equal(1, o.get());
            assert.equal(2, c.get());
            assert.equal(1, o.observersCount);
            assert.equal(2, c.revision);
            assert.equal(2, o.observerRevisions[0]);

            assert.equal(1, o.get());
            assert.equal(2, c.get());
            assert.equal(1, o.observersCount);
            assert.equal(2, c.revision);
            assert.equal(2, o.observerRevisions[0]);
        });
        it('creates computable that uses two observables', function() {
            var o1 = observable(2);
            var o2 = observable(3);
            var c = computable(function() {return o1.get() * o2.get()})
            assert.equal(2, o1.get());
            assert.equal(3, o2.get());
            assert.equal(6, c.get());
            assert.equal(1, o1.observersCount);
            assert.equal(1, o2.observersCount);
            assert.equal(0, c.observersCount);
        });
        it('creates computable that recieves an update of revision from observable', function() {
            var o1 = observable(2);
            var o2 = observable(3);
            var c = computable(function() {return o1.get() * o2.get()})
            assert.equal(6, c.get());

            o1.set(5);
            assert.equal(15, c.get());
            assert.equal(1, o1.observersCount);
            assert.equal(1, o2.observersCount);

            o2.set(10);
            assert.equal(50, c.get());
            assert.equal(1, o1.observersCount);
            assert.equal(1, o2.observersCount);
        });
        it('creates computable with 3 observables, test lazy unsubscribe', function() {
            var o1 = observable(false);
            var o2 = observable(5);
            var o3 = observable(10);
            var c = computable(function(){ return o1.get() ? o2.get() : o3.get()})

            assert.equal(10, c.get());
            assert.equal(1, o1.observersCount);
            assert.equal(0, o2.observersCount);
            assert.equal(1, o3.observersCount);

            o1.set(true);
            assert.equal(5, c.get());
            assert.equal(1, o1.observersCount);
            assert.equal(1, o2.observersCount);
            assert.equal(1, o3.observersCount);   // lazy unsubscription

            o3.set(11);
            assert.equal(0, o3.observersCount);   // it was unsubscribed on its set()
            assert.equal(5, c.get());
            assert.equal(1, o1.observersCount);
            assert.equal(1, o2.observersCount);
            assert.equal(0, o3.observersCount);

            o1.set(false);
            assert.equal(11, c.get());
            assert.equal(1, o1.observersCount);
            assert.equal(1, o2.observersCount);   // lazy unsubscription
            assert.equal(1, o3.observersCount);   

            o2.set(6);
            assert.equal(0, o2.observersCount);   // it was unsubscribed on its set()
            assert.equal(11, c.get());
            assert.equal(1, o1.observersCount);
            assert.equal(0, o2.observersCount);
            assert.equal(1, o3.observersCount);         
        })
    })
})