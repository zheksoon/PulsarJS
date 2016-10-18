var o = require('./Observable');

var firstName = new o.Observable('Eugene');
var lastName = new o.Observable('Daragan');
var age = new o.Observable(22);
var displayAge = new o.Observable(false);

var fullName = new o.Computable(function() {
    return firstName.get() + ' ' + lastName.get();
});

var runner = new o.Reaction(function() {
    if (displayAge.get()) {
        console.log(`Full name: ${fullName.get()}; Age: ${age.get()}`)
    } else {
        console.log(`Full name: ${fullName.get()}`);
    }
})

o.transaction(() => {
    firstName.set('Andrey');
    lastName.set('Luzhkovky');
    age.set(23);
    displayAge.set(true);
    age.set(24);
    o.transaction(function() {
        firstName.set('Eugene');
        lastName.set('Daragan');
    })
    displayAge.set(true);
    age.set(22);
})