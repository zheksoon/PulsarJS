var Benchmark = require('benchmark');

var pulsar = require('../src/core');
var pulsarObservable = pulsar.observable;
var pulsarComputable = pulsar.computable;
var pulsarObserver = pulsar.reaction;
var Observable = pulsar.Observable;

var mobx = require('mobx');
var mobxObservable = mobx.observable;
var mobxComputable = mobx.computed;
var mobxObserver = mobx.autorun;
var extendObservable = mobx.extendObservable;


function observableClass(constructor) {
  var classPrototype = Object.create(constructor);
  classPrototype.__initObservables = false;
  classPrototype.__observableNames = null;

  function createPropertyDescriptor(name) {
    return {
      get: function() { return this.__observables[name].get() },
      set: function(value) { this.__observables[name].set(value) },
    }
  }

  var classConstructor = function() {
    constructor.apply(this, arguments);
    if (this.__observables) {
      var observables = this.__observables;
      if (!this.__initObservables) {
        var names = Object.keys(observables);      
        var properties = {};
        for (var i = 0; i < names.length; i++) {
          var name = names[i];
          observables[name] = new Observable(observables[name]);
          properties[name] = createPropertyDescriptor(name);
        }
        Object.defineProperties(classPrototype, properties);
        classPrototype.__initObservables = true;
        classPrototype.__observableNames = names;
      } else {
        var names = classPrototype.__observableNames;
        for (var i = 0; i < names.length; i++) {
          var name = names[i];
          observables[name] = new Observable(observables[name]);      
        }
      }
    }
  }

  classConstructor.prototype = classPrototype;

  return classConstructor;
}

function defineObservables(self, observables) {
  self.__observables = observables;
}


var pulsarClass = observableClass(function(name) {
    this.firstName = name;

    defineObservables(this, {
        a: name,    
        b: undefined,
        c: 1,
        d: 1.2,
        e: null,
        f: /abc/g,
        g1: null, 
        g2: null, 
        g3: null, 
        g4: null, 
        g5: null, 
        g5: null, 
        g6: null, 
        g7: null, 
        g8: null, 
        g9: null, 

    })
});

var mobxClass = function(name) {
    this.firstName = name;

    extendObservable(this, {
        a: name,    
        b: undefined,
        c: 1,
        d: 1.2,
        e: null,
        f: /abc/g,
        g1: null, 
        g2: null, 
        g3: null, 
        g4: null, 
        g5: null, 
        g5: null, 
        g6: null, 
        g7: null, 
        g8: null, 
        g9: null,         
    })
};

// var a = new pulsarClass('Eugene');
// if (a.a !== 'Eugene' && a.b !== undefined) {
//     throw new Error();
// }

(function() {
    var suite = new Benchmark.Suite;

    suite.add('pulsar observable object', function() {
        var a = new pulsarClass('Eugene');
        if (a.firstName !== a.a) {
            throw new Error();
        }
    })
    .add('mobx observable object', function() {
        var a = new mobxClass('Eugene');
        if (a.firstName !== a.a) {
            throw new Error();
        }        
    })
    .on('cycle', function(event) {
      console.log(String(event.target));
    })
    .on('complete', function() {
      console.log('Fastest is ' + this.filter('fastest').map('name'));
    })
    .run();
})();

// var count = 0;
// var target = 0;

// var pObservable = pulsarObservable(0);
// var pObserver = pulsarObserver(() => {
//     target = pObservable.get();
// });

// var mObservable = mobxObservable(0);
// var mObserver = mobxObserver(() => {
//     target = mObservable.get();
// });

// count++;
// pObservable.set(count);
// if (target !== count) {
//     throw new Error();
// }

// (function() {
//     var suite = new Benchmark.Suite;

//     var count = 0;
//     var target = 0;

//     var pObservable = pulsarObservable(0);
//     var pObserver = pulsarObserver(() => {
//         target = pObservable.get();
//     });

//     var mObservable = mobxObservable(0);
//     var mObserver = mobxObserver(() => {
//         target = mObservable.get();
//     });

//     suite.add('PulsarJS observable change propagation', function() {
//         count++;
//         pObservable.set(count);
//         if (target !== count) {
//             throw new Error();
//         }
//     })
//     .add('MobX observable change propagation', function() {
//         count++;
//         mObservable.set(count);
//         if (target !== count) {
//             throw new Error();
//         }
//     })
//     .on('cycle', function(event) {
//       console.log(String(event.target));
//     })
//     .on('complete', function() {
//       console.log('Fastest is ' + this.filter('fastest').map('name'));
//     })
//     .run();
// })();

// (function() {
//     var suite = new Benchmark.Suite;

//     var count = 0;
//     var target = 0;

//     var pObservable = pulsarObservable(0);
//     var pComputable = pulsarComputable(() => {
//         return pObservable.get() * 2;
//     });
//     var pObserver = pulsarObserver(() => {
//         target = pComputable.get();
//     });

//     var mObservable = mobxObservable(0);
//     var mComputable = mobxComputable(() => {
//         return mObservable.get() * 2;
//     });
//     var mObserver = mobxObserver(() => {
//         target = mComputable.get();
//     });

//     suite.add('PulsarJS observable change propagation with 1 computable chain', function() {
//         count++;
//         pObservable.set(count);
//         if (target !== count * 2) {
//             throw new Error();
//         }
//     })
//     .add('MobX observable change propagation with 1 computable chain', function() {
//         count++;
//         mObservable.set(count);
//         if (target !== count * 2) {
//             throw new Error();
//         }
//     })
//     .on('cycle', function(event) {
//       console.log(String(event.target));
//     })
//     .on('complete', function() {
//       console.log('Fastest is ' + this.filter('fastest').map('name'));
//     })
//     .run();
// })();

// (function() {
//     var suite = new Benchmark.Suite;

//     var count = 0;
//     var target = 0;

//     var po = pulsarObservable(0);
//     var pc1 = pulsarComputable(() => {
//         return po.get() * 2;
//     });
//     var pc2 = pulsarComputable(() => {
//         return pc1.get() * 2;
//     });
//     var pc3 = pulsarComputable(() => {
//         return pc2.get() * 2;
//     });
//     var pr = pulsarObserver(() => {
//         target = pc3.get();
//     });

//     var mo = mobxObservable(0);
//     var mc1 = mobxComputable(() => {
//         return mo.get() * 2;
//     });
//     var mc2 = mobxComputable(() => {
//         return mc1.get() * 2;
//     });
//     var mc3 = mobxComputable(() => {
//         return mc2.get() * 2;
//     });
//     var mr = mobxObserver(() => {
//         target = mc3.get();
//     });

//     suite.add('PulsarJS observable change propagation with 3 computable chain', function() {
//         count++;
//         po.set(count);
//         if (target !== count * 8) {
//             throw new Error();
//         }
//     })
//     .add('MobX observable change propagation with 3 computable chain', function() {
//         count++;
//         mo.set(count);
//         if (target !== count * 8) {
//             throw new Error();
//         }
//     })
//     .on('cycle', function(event) {
//       console.log(String(event.target));
//     })
//     .on('complete', function() {
//       console.log('Fastest is ' + this.filter('fastest').map('name'));
//     })
//     .run();
// })();

// (function() {
//     var suite = new Benchmark.Suite;

//     var count = 0;
//     var target = 0;

//     var po = pulsarObservable(0);
//     var pc1 = pulsarComputable(() => {  // x * 2
//         return po.get() * 2;
//     });
//     var pc2 = pulsarComputable(() => {  // x * 4
//         return pc1.get() * 2;
//     });
//     var pc3 = pulsarComputable(() => {  // x * 8
//         return pc2.get() * 2;
//     });
//     var pc4 = pulsarComputable(() => {  // x * 2 + x * 8 = x * 10
//         return pc1.get() + pc3.get(); 
//     });
//     var pr = pulsarObserver(() => {     // x * 10 + x * 4 + x * 2 + x = x * 17
//         target = pc4.get() + pc2.get() + pc1.get() + po.get();
//     });

//     var mo = mobxObservable(0);
//     var mc1 = mobxComputable(() => {
//         return mo.get() * 2;
//     });
//     var mc2 = mobxComputable(() => {
//         return mc1.get() * 2;
//     });
//     var mc3 = mobxComputable(() => {
//         return mc2.get() * 2;
//     });
//     var mc4 = mobxComputable(() => {
//         return mc1.get() + mc3.get();
//     });    
//     var mr = mobxObserver(() => {
//         target = mc4.get() + mc2.get() + mc1.get() + mo.get();
//     });

//     suite.add('PulsarJS observable change propagation with 4 computable chain (complex)', function() {
//         count++;
//         po.set(count);
//         if (target !== count * 17) {
//             throw new Error();
//         }
//     })
//     .add('MobX observable change propagation with 4 computable chain (complex)', function() {
//         count++;
//         mo.set(count);
//         if (target !== count * 17) {
//             throw new Error();
//         }
//     })
//     .on('cycle', function(event) {
//       console.log(String(event.target));
//     })
//     .on('complete', function() {
//       console.log('Fastest is ' + this.filter('fastest').map('name'));
//     })
//     .run();
// })();

// (function() {
//     var suite = new Benchmark.Suite;

//     var count = 0;
//     var target1, target2, target3;

//     var po = pulsarObservable(0);
//     var pc1 = pulsarComputable(() => {  // x * 2
//         return po.get() * 2;
//     });
//     var pc2 = pulsarComputable(() => {  // x * 4
//         return pc1.get() * 2;
//     });
//     var pc3 = pulsarComputable(() => {  // x * 8
//         return pc2.get() * 2;
//     });
//     var pc4 = pulsarComputable(() => {  // x * 2 + x * 8 = x * 10
//         return pc1.get() + pc3.get(); 
//     });
//     var pr1 = pulsarObserver(() => {     // x * 10 + x * 4 + x * 2 + x = x * 17
//         target1 = pc4.get() + pc2.get() + pc1.get() + po.get();
//     });
//     var pr2 = pulsarObserver(() => {
//         target2 = pc1.get() + pc3.get();
//     });
//     var pr3 = pulsarObserver(() => {  
//         target3 = po.get() + pc2.get() + pc3.get();
//     });



//     var mo = mobxObservable(0);
//     var mc1 = mobxComputable(() => {
//         return mo.get() * 2;
//     });
//     var mc2 = mobxComputable(() => {
//         return mc1.get() * 2;
//     });
//     var mc3 = mobxComputable(() => {
//         return mc2.get() * 2;
//     });
//     var mc4 = mobxComputable(() => {
//         return mc1.get() + mc3.get();
//     });    
//     var mr1 = mobxObserver(() => {
//         target1 = mc4.get() + mc2.get() + mc1.get() + mo.get();
//     });
//     var mr2 = mobxObserver(() => {
//         target2 = mc1.get() + mc3.get();
//     });
//     var mr3 = mobxObserver(() => {
//         target3 = mo.get() + mc2.get() + mc3.get();
//     });

//     suite.add('PulsarJS observable change propagation with 4 computable chain (complex, 3 reactions)', function() {
//         count++;
//         po.set(count);
//         if (target1 !== count * 17 || target2 !== count * 10 || target3 !== count * 13) {
//             throw new Error();
//         }
//     })
//     .add('MobX observable change propagation with 4 computable chain (complex, 3 reactions)', function() {
//         count++;
//         mo.set(count);
//         if (target1 !== count * 17 || target2 !== count * 10 || target3 !== count * 13) {
//             throw new Error();
//         }        
//     })
//     .on('cycle', function(event) {
//       console.log(String(event.target));
//     })
//     .on('complete', function() {
//       console.log('Fastest is ' + this.filter('fastest').map('name'));
//     })
//     .run();
// })();