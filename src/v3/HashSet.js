var FILL_FACTOR_BY_16 = 11; // 11/16 = 68.75%
var MIN_HASH_LENGTH = 4;

function HashSet() {
    this._size = 0;
    this._items = [undefined, undefined];
}

HashSet.prototype.add = function(item) {
    var items = this._items;
    var length = items.length;

    var hash = item._hash & (length - 1);
    while (items[hash] !== undefined && items[hash] !== item) {
        hash = (hash + 1) & (length - 1);
    }
    if (items[hash] === undefined) {
        items[hash] = item;  

        if (++this._size > (length * FILL_FACTOR_BY_16) >> 4) {
            length <<= 1;
            this._rehashUp(length);
        }
        return true;
    } else {
        return false;
    }
}

HashSet.prototype._rehashUp = function(length) {
    var items = this._items;
    var oldLength = items.length;
    var i, item, hash;

    items.length = length;
    for (i = oldLength; i < length; i++) {
        items[i] = undefined;
    }
    for (i = 0; i < length; i++) {
        item = items[i];
        if (item === undefined) {
            if (i < oldLength) continue; else break;
        }
        items[i] = undefined;

        hash = item._hash & (length - 1);
        while (items[hash] !== undefined) {
            hash = (hash + 1) & (length - 1);
        }

        items[hash] = item;
    }
}

HashSet.prototype._rehashDown = function(length) {
    var items = this._items;
    var oldLength = items.length;
    var i, item, hash;
    for (i = length; i < oldLength; i++) {
        item = items[i];
        if (item === undefined) continue;
        hash = item._hash & (length - 1);
        while (items[hash] !== undefined) {
            hash = (hash + 1) & (length - 1);
        }
        items[hash] = item;
    }
    items.length = length;
}

/*

// Generic rehash - not needed but useful for future purposes

HashSet.prototype.rehash = function(length) {
    if ((length & (length - 1)) !== 0) {
        throw new Error('length should be power of 2');
    }
    var oldLength = this._items.length;
    if (length === oldLenght) return;
    if (length > oldLength) {
        this._rehashUp(length);
    } else {
        this._rehashDown(length);
    }
}

*/

HashSet.prototype.resize = function() {
    var items = this._items;
    var length = items.length;
    if (this._size < (length * FILL_FACTOR_BY_16) >> 5 && length > MIN_HASH_LENGTH) {
        items.length = length >> 1;
    }
}

HashSet.prototype.remove = function(item) {
    var items = this._items;
    var length = items.length - 1;
    var hash = item._hash & length;
    var moveHash, moveItem;
    while (items[hash] !== undefined && items[hash] !== item) {
        hash = (hash + 1) & length;
    }
    if (items[hash] !== undefined) {
        items[hash] = undefined;
        moveHash = (hash + 1) & length;
        while ((moveItem = items[moveHash]) !== undefined) {      
            if (((moveHash - moveItem._hash) & length) >= ((moveHash - hash) & length)) {
                items[hash] = moveItem;
                items[moveHash] = undefined;
                hash = moveHash;
            }
            moveHash = (moveHash + 1) & length;
        }
        // this._size--;
        
        //  one should rehash the table on remove, but we use heuristic to reduce number of memory reallocs
        //  in the main code of observable. Uncomment it if you need to rehash the table progressively
        
        if (--this._size < (++length * FILL_FACTOR_BY_16) >> 5 && length > MIN_HASH_LENGTH) {
            length >>= 1;
            this._rehashDown(length);
        }
        
        return true;
    } else {
        return false;
    }
}

HashSet.prototype.has = function(item) {
    if (this._size === 0) return false;

    var items = this._items;
    var length = items.length - 1;

    var hash = item._hash & length;
    while (items[hash] !== undefined && items[hash] !== item) {
        hash = (hash + 1) & length;
    }
    return (items[hash] !== undefined);
}

/*
    Special iteration order of forEach allows to remove (explicitly or implicitly) items 
    from set while iterating without breaking linear probing hash table properties, so
    any items removed during iteration won't appear in the iteration as expected.
*/

HashSet.prototype.forEach = function(iterator) {
    if (this._size === 0) return;

    var items = this._items;
    var length = items.length - 1;
    var i = length;
    while (items[i] === undefined) i = (i - 1) & length;
    while (items[i] !== undefined) i = (i + 1) & length;
    for (var j = (i - 1) & length; j !== i; j = (j - 1) & length) {
        if (items[j] !== undefined) {
            iterator(items[j], j, items);
        }
    }
}

HashSet.prototype.items = function() {
    return this._items;
}

HashSet.prototype.size = function() {
    return this._size;
}

HashSet.prototype.setSize = function(size) {
    this._size = size;
}

/*

// Verify hash table correctness - i.e. each element in the table can be found in it
// using regular linear probing rules

HashSet.prototype._verify = function() {
    var items = this._items;
    var length = items.length;
    for (var i = 0; i < length; i++) {
        var item = items[i];
        if (!item) continue;
        var hash = item._hash & (length - 1);
        var pos = hash;
        while (items[hash] !== undefined && items[hash] !== item) {
            hash = (hash + 1) & (length - 1);
        }
        if (items[hash] === undefined) {
            var hashes = items.map((item) => item ? item._hash & (length - 1) : 'null').join(', ');
            throw new Error(`Verify failed: for index ${i} desired ${pos} but undefined at ${hash} length ${length}\n${hashes}`);
        }
    }
}

*/

module.exports = HashSet;
