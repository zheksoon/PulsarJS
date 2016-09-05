import React, { Component } from 'react';
import {observable, Reaction} from '../../pulsar-js';

function reactiveFunction(fn) {
  return reactiveComponent(Component, fn);
}

function reactiveComponent(component, render) {

    var reactive = function() {
        component.apply(this, arguments);

        var proto = component.prototype;
        this._render = typeof render === 'function' ? render : proto.render;
        this._componentWillMount = proto.componentWillMount;
        this._shouldComponentUpdate = proto.shouldComponentUpdate;
        this._componentWillUnmount = proto.componentWillUnmount;
    }

    reactive.prototype = Object.create(component.prototype);

    reactive.prototype.componentWillMount = function() {
        var self = this;
        this.reaction = new Reaction(this._render.bind(this), function() {
            self.forceUpdate();
        });
        if (typeof this._componentWillMount === 'function') {
            this._componentWillMount();
        }
    }

    reactive.prototype.shouldComponentUpdate = function(nextProps, nextState) {
        return  this.reaction.revision !== this.reaction.resultRevision || 
                (typeof this._componentShouldUpdate === 'function' && this._componentShouldUpdate(nextProps, nextState))
    };

    reactive.prototype.componentWillUnmount = function() {
        this.reaction.cancel();
        if (typeof this._componentWillUnmount === 'function') {
            this._componentWillUnmount();
        }
    };

    reactive.prototype.render = function() {
        return this.reaction.runReaction(this.props);
    };

    return reactive;
}

function reactive(target) {
  if (typeof target === 'function' && 
       (!target.prototype || !target.prototype.render) && !target.isReactClass && !Component.isPrototypeOf(target)) {
    return reactiveFunction(target);
  } else {
    return reactiveComponent(target);
  }
}