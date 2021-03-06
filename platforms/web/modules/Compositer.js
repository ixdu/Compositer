/*
  Implementation of capsule Compositer module for browser

  Copyright (C) 2011  Alexey Bagin aka freeze (email freeze@2du.ru)
  Copyright (c) 2014  Nikita Zaharov aka ix (email ix@2du.ru)

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as
  published by the Free Software Foundation, either version 3 of the
  License, or (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.'

  version 0.7.5
*/

/* Compositer */

var comp = (function () {

    'use strict';

    /* Universal method to take window size in different browsers */

    var wsSize = {};

    wsSize.detect = function () {
        this.way =
            (window.innerWidth &&
                window.innerHeight) ? 1 :
            (document.body &&
                document.body.clientWidth &&
                document.body.clientHeight) ? 2 :
            (document.documentElement &&
                document.documentElement.clientWidth &&
                document.documentElement.clientHeight) ? 3 : 4;

        return this.way;
    };

    wsSize.take = function () {
        var way = (this.way === undefined) ? this.detect() : this.way;

        switch (way) {
            case 1:
                return {
                    width : window.innerWidth,
                    height : window.innerHeight
                };

            case 2:
                return {
                    width : document.body.clientWidth,
                    height : document.body.clientHeight
                };

            case 3:
                return {
                    width : document.documentElement.clientWidth,
                    height : document.documentElement.clientHeight
                };
            default:
                throw new Error(
                    'Can not detect window size in this browser'
                );
        }
    };

    /* Pool */

    /** @constructor */

    var Pool = function () {
        this.pool = []; this.available = []; this.count = 0;

        return undefined;
    };

    Pool.prototype.put = function (data) {
        var id = this.available.shift();

        if (id === undefined) {
            id = this.pool.push();
        }

        this.pool[id] = data;
        this.count++;

        return id;
    };

    Pool.prototype.take = function (id) {
        return this.pool[id];
    };

    Pool.prototype.free = function (id) {
        delete this.pool[id];

        this.available.push(id);
        this.count--;

        return undefined;
    };


    /* Unit */

    /** @constructor */

    var Unit = function (type, object) {
        if (typeof type !== 'string') {
            return undefined;
        }

        if (typeof this.types[type] !== 'function') {
            return undefined;
        }

        if (typeof object !== 'object') {
            object = {};
        }

        return new this.types[type](object);
    };

    Unit.pool = new Pool();

    //set id of element if passed or get if it is not
    Unit.prototype.id = function (id) {
        var parseResult;

        if (typeof id !== 'number') {
            parseResult = (/^_(\d+)$/).exec(this.html['id']);

            if (parseResult !== null) {
                return +parseResult[1];
            }
        } else {
            this.html['id'] = '_' + id;

            return undefined;
        }
    };

    Unit.prototype.prepare = function (object) {
        this.html.style.position = 'fixed';
        this.html.style.margin   = '0px';
        this.html.style.padding  = '0px';

        var value, propertyName;

        for (propertyName in this.defaults) {
            if (this.defaults.hasOwnProperty(propertyName)) {
                if (typeof object[propertyName] === 'string') {
                    value = new Unit.Value(object[propertyName], propertyName);
                } else {
                    value =
                        new Unit.Value(
                            this.defaults[propertyName], undefined
                        );
                }

                this[propertyName] = value;

                value.apply(this);
            }
        }

        return undefined;
    };

    Unit.prototype.defaults = {
        width   : {type : 'width',   value : 100, unit : '%' },
        height  : {type : 'height',  value : 100, unit : '%' },
        x       : {type : 'x',       value : 0,   unit : 'px'},
        y       : {type : 'y',       value : 0,   unit : 'px'},
        z_index : {type : 'z_index', value : 1               },
        opacity : {type : 'opacity', value : 0,   unit : '%' }
    };


    /* Unit types */

    Unit.prototype.types = {};


    /* Frame unit */

    Unit.prototype.types['frame'] = function (object) {
        this.childs = [];

        this.html = document.createElement('div');

        this.init(object);
        this.prepare(object);
    };

    Unit.prototype.types['frame'].prototype = new Unit(undefined, undefined);

    Unit.prototype.types['frame'].prototype.init = function (object) {
        if (typeof object.color === 'string') {
            this.html.style.backgroundColor = object.color;
        }
	this.html.ondragstart = function(){ return false; };
    };


    /* Image unit */

    Unit.prototype.types['image'] = function (object) {
        this.html = document.createElement('img');

        this.init(object);

        this.prepare(object);
    };

    Unit.prototype.types['image'].prototype = new Unit(undefined, undefined);

    Unit.prototype.types['image'].prototype.init = function (object) {
        if (typeof object.source === 'string') {
            this.html.src = object.source;
        } else
	    if(typeof object.source == 'object'){
		this.html.src = object.source.get_link_http();
	    }

        this.html.alt = '';
	this.html.ondragstart = function(){ return false; };
    };


    /* Text unit */

    Unit.prototype.types['text'] = function (object) {
        this.html = document.createElement('span');

        this.html.style.fontFamily = 'monospace';
        this.html.style.textAlign  = 'center';
        this.html.style.whiteSpace = 'pre';

        this.init(object);

        this.prepare(object);
    };

    Unit.prototype.types['text'].prototype = new Unit(undefined, undefined);

    Unit.prototype.types['text'].prototype.init = function (object) {
        if (typeof object.text === 'string') {
            this.html.innerHTML = object.text;
        }

        if (typeof object.color === 'string') {
            this.html.style.color = object.color;
        }
    };

    Unit.prototype.types['text'].prototype.resized = function () {
        if (typeof this.width !== 'object' || typeof this.height !== 'object') {
            return undefined;
        }

        this.fontSize.apply(this);
    };

    Unit.prototype.types['text'].prototype.fontSize = {};

    Unit.prototype.types['text'].prototype.fontSize.detect = function () {
        var span = document.createElement('span'), fontSize = 16;

        span.innerHTML        = 'X';

        span.style.position   = 'fixed';

        span.style.margin     = '0px';
        span.style.padding    = '0px';

        span.style.fontFamily = 'monospace';
        span.style.fontSize   = fontSize + 'px';

        document.body.appendChild(span);

        this.widthWeight = fontSize / span.clientWidth;

        document.body.removeChild(span);

        return this.widthWeight;
    };

    Unit.prototype.types['text'].prototype.fontSize.apply = function (target) {
        var widthWeight =
            (this.widthWeight === undefined) ?
                this.detect() : this.widthWeight,

            string = target.html.innerHTML,

            width  = target.width.px().value,
            height = target.height.px().value,

            font   = {
                width  : width / string.length * widthWeight,
                height : height
            },

            fontSize = (font.width < font.height) ? font.width : font.height;

        target.html.style.fontSize   = fontSize + 'px';
        target.html.style.lineHeight = height   + 'px';
    };

    /*Entry unit*/

    Unit.prototype.types['entry'] = function (object) {
        this.html = document.createElement('input');
	this.html.type = 'text';
	var unit = this;
	this.control = {
	    on_text_change : function(callback){
		unit.html.onchange = function(){
		    callback(unit.html.value);
		};
	    },
	    set_placeholder : function(text){
		unit.html.placeholder = text;
	    },
	    get_value : function(){
		return unit.html.value;
	    },
	    set_value : function(value){
		unit.html.value = value;
	    }
	};

        this.init(object);

        this.prepare(object);
    };

    Unit.prototype.types['entry'].prototype = new Unit(undefined, undefined);

    Unit.prototype.types['entry'].prototype.init = function (object) {
        if (typeof object.placeholder === 'string') {
            this.html.placeholder = object.placeholder;
        }

        if (typeof object.size === 'string') {
            this.html.size = object.size;
        }
    };

    /*Button unit*/

    Unit.prototype.types['button'] = function (object) {
        this.html = document.createElement('input');
	this.html.type = 'button';
	var unit = this;
	this.control = {
	    on_press : function(callback){
		unit.html.onclick = function(){
		    callback();
		};
	    },
	    set_label : function(label){
		unit.html.value = label;	
	    }
	};

        this.init(object);

        this.prepare(object);
    };

    Unit.prototype.types['button'].prototype = new Unit(undefined, undefined);

    Unit.prototype.types['button'].prototype.init = function (object) {
        if (typeof object.label === 'string') {
            this.html.value = object.label;
        }
    };

    /*Video unit*/

    Unit.prototype.types['video'] = function (object) {
        this.html = document.createElement('video');
	var unit = this;
	this.source_child = document.createElement('source');
	unit.html.style = 'object-fit:fill;';
	//if(object.hasOwnProperty('source')){
//	    unit.source_child.src = "http://docs.gstreamer.com/media/sintel_trailer-480p.ogv";
	//}
	this.control = {
	    load : function(address){
		unit.source_child.src = address;	
		unit.html.appendChild(unit.source_child);
	    },
	    play : function(callback){
		unit.html.play();
	    },
	    pause : function(){
		unit.html.pause();
	    },
	    set_position : function(mseconds){
		unit.html.currentTime = mseconds / 1000;
	    },
	    get_position : function(){
		return unit.html.currentTime * 1000;
	    },
	    get_duration : function(){
		return unit.html.duration * 1000;
	    },
	    get_volume : function(){
		return unit.html.volume;
	    },
	    set_volume : function(volume){
		unit.html.volume = volume;
	    },
	    on_timeupdate : function(callback){
		unit.html.ontimeupdate = callback;
	    }
	};

        this.init(object);

        this.prepare(object);
    };

    Unit.prototype.types['video'].prototype = new Unit(undefined, undefined);

    Unit.prototype.types['video'].prototype.init = function (object) {
        if (typeof object.source === 'string') {
//            this.html.size = object.size;
        }
    };

    /* Root unit */

    Unit.root = new Unit(undefined, undefined);

    Unit.root.init = function () {
        if (typeof document.body !== 'object' || typeof wsSize.take() !== 'object') {
            return false;
        }

        this.html = document.body;

        this.html.innerHtml = '';

        this.prepare({});

        var root = this;

        window.onresize = function () {
            root.width.value  = wsSize.take().width;
            root.height.value = wsSize.take().height;

            root.width.apply(root); root.height.apply(root);

            var childKey, propertyKey, child;

            for (childKey in root.childs) {
                if (root.childs.hasOwnProperty(childKey)) {
                    child = root.childs[childKey];

                    for (propertyKey in child.defaults) {
                        if (child.defaults.hasOwnProperty(propertyKey)) {
                            child[propertyKey].apply(child);
                        }
                    }
                }
            }
        };

        return this;
    };

    Unit.root.childs = [];


    /* Value */

    /** @constructor */

    Unit.Value = function (value, type) {
        var typeName =
            (typeof type === 'string') ? type :
            (typeof value === 'object' &&
            typeof value.type === 'string') ? value.type : null;

        if (typeName === null) {
            return undefined;
        }

        if (typeof this.types[typeName] !== 'function') {
            return undefined;
        }

        var dissassembleResult;

        value =
            (typeof value === 'object') ? value :
            (typeof value === 'string') ?
                (typeof
                    (dissassembleResult = this.dissassemble(value)) ===
                'object') ? dissassembleResult : {}
            : {};

        type = new this.types[typeName]();

        type.type = typeName;

        type.value =
            (typeof value.value === 'number') ? value.value  :
            (!isNaN(+value.value))            ? +value.value : 0;

        type.unit = (typeof value.unit === 'string') ? value.unit : null;

        return type;
    };

    Unit.Value.prototype.dissassemble = function (input) {
        var parseResult = (/([+,\-]?\d+\.?\d*)(\D*)/).exec(input);

        if (parseResult === null) {
            return false;
        }

        var result = {};

        result.value = +parseResult[1];
        result.unit  =  parseResult[2];

        if (result.value === undefined) {
            result.value = 0;
        }

        if (result.unit === '')  {
            result.unit = null;
        }

        return result;
    };

    Unit.Value.prototype.group = function () {
        var propertyGroup =
            (this.type === 'width' || this.type === 'height') ? 'size'     :
            (this.type === 'x'     || this.type === 'y'     ) ? 'position' :
            'other';

        return propertyGroup;
    };

    Unit.Value.prototype.apply = function (target) {
        var group = this.group(),

            unit = ((this.unit === null) ? '%' : this.unit),
            type = this.px(target, true),

            assembledValue = Math.round(type.value);


        if (group === 'size') {
            assembledValue = Math.abs(assembledValue);
        }

        assembledValue += 'px';

        target.html.style[this.correct[this.type]] = assembledValue;

        if (group === 'size' && typeof target.resized === 'function') {
            target.resized();
        }

        var childKey, child;

        for (childKey in target.childs) {
            if (target.childs.hasOwnProperty(childKey)) {
                child = target.childs[childKey];
                child[this.type].apply(child);
            }
        }

        return undefined;
    };

    Unit.Value.prototype.px = function (context, recalc) {
        if (recalc !== true && typeof this.cache === 'object') {
            return this.cache;
        }

        var group = this.group();

        if (group === 'other') {
            return undefined;
        }

        var parent = context.parent;

	var value;

	if(this.unit === 'px'){
	    value = (typeof parent === 'object') ?
	        group == 'size' ? 
	            this.value :
	            parent[this.type].px(parent).value + this.value 
	    :
	        this.value;
	    
	} else {
            value =
                (typeof parent === 'object') ?
                    (group === 'size') ?
                        parent[this.type].px(parent).value / 100 * this.value 
		    :
                        parent[this.type].px(parent).value +
                        parent[
                            (this.type === 'x') ? 'width' : 'height'
                        ].px(parent).value / 100 * this.value 
                :
                    (this.type === 'x' || this.type === 'y') ? 0 :
                        (this.type === 'width') ?
                            wsSize.take().width : wsSize.take().height;	    
	}


        this.cache = new Unit.Value({
            type  : this.type,
            value : value,
            unit  : 'px'
        }, undefined);

        return this.cache;
    };

    Unit.Value.prototype.correct = {
        width  : 'width',
        height : 'height',
        x      : 'left',
        y      : 'top'
    };


    /* Value types */

    Unit.Value.prototype.types = {};


    /* Width type */

    Unit.Value.prototype.types['width'] = function () {};
    Unit.Value.prototype.types['width'].prototype = new Unit.Value(undefined, undefined);

    Unit.Value.prototype.types['width'].prototype.work = true;


    /* Height type */

    Unit.Value.prototype.types['height'] = function () {};
    Unit.Value.prototype.types['height'].prototype = new Unit.Value(undefined, undefined);

    Unit.Value.prototype.types['height'].prototype.work = true;


    /* X type */

    Unit.Value.prototype.types['x'] = function () {};
    Unit.Value.prototype.types['x'].prototype = new Unit.Value(undefined, undefined);

    Unit.Value.prototype.types['x'].prototype.work = true;


    /* Y Type */

    Unit.Value.prototype.types['y'] = function () {};
    Unit.Value.prototype.types['y'].prototype = new Unit.Value(undefined, undefined);

    Unit.Value.prototype.types['y'].prototype.work = true;


    /* Z-index type */

    Unit.Value.prototype.types['z_index'] = function () {};
    Unit.Value.prototype.types['z_index'].prototype = new Unit.Value(undefined, undefined);

    Unit.Value.prototype.types['z_index'].prototype.work = true;

    Unit.Value.prototype.types['z_index'].prototype.apply = function (target) {
        target.html.style.zIndex = Math.round(this.value);
    };


    /* Opacity type */

    Unit.Value.prototype.types['opacity'] = function () {};
    Unit.Value.prototype.types['opacity'].prototype = new Unit.Value(undefined, undefined);

    Unit.Value.prototype.types['opacity'].prototype.apply = function (target) {
        if (this.constructor.prototype.work === false) {
            return undefined;
        }

        var opacity = 1 - (Math.abs(this.value) / 100);

        opacity = (opacity < 0) ? 0 : opacity;

        target.html.style.opacity = opacity;

        if (this.constructor.prototype.work === undefined) {

            if (+target.html.style.opacity === opacity) {
                this.constructor.prototype.work = true;
            } else {
                this.constructor.prototype.work = false;

                return undefined;
            }
        }

        return undefined;
    };


    /* Animation */

    /** @constructor */

    var Animation = function (chain) {
        if (!this.init(chain)) {
            return {};
        }
    };

    Animation.pool = new Pool();

    Animation.prototype.init = function (chain) {
        if (
            chain             === undefined ||
            chain.constructor !== Array     ||
            chain.length      <   1
        ) {
            return false;
        }

        this.acts  = chain;
        this.binds = new Pool();

        return true;
    };


    /* Animation bind */

    /** @constructor */

    Animation.Bind = function (element, animation) {
        if (this.init(element, animation) === false) {
            return {};
        }
    };

    Animation.Bind.pool = new Pool();

    Animation.Bind.prototype.init = function (element, animation) {
        if (element === undefined) {
            return false;
        }

        if (animation === undefined) {
            return false;
        }

        this.element   = element;
        this.animation = animation;

        this.act = 0;
        this.initAct(this.act, undefined);

        return true;
    };

    Animation.Bind.prototype.initAct = function (actId, late) {
        var act = this.animation.acts[actId];

        if (act === undefined) {
            this.act = 0;
            this.initAct(this.act, undefined);

            this.stop();

            return undefined;
        }

        this.duration =
            (act['duration']) ? act['duration'] + ((late) ? late : 0) : 0;

        this.vectors = {};

        var actionName;

        for (actionName in act['actions']) {
            if (act['actions'].hasOwnProperty(actionName)) {
                this.vectors[actionName] = act['actions'][actionName];
            }
        }

        return true;
    };

    Animation.Bind.prototype.start = function () {
        this.workerPoolId = Animation.worker.pool.put(this);

        Animation.worker(undefined);
    };

    Animation.Bind.prototype.stop = function () {
        if (this.workerPoolId === undefined) {
            return false;
        }

        Animation.worker.pool.free(this.workerPoolId);

        if (this.callback) {
            window['incident']({type : 'animation_stopped', currentTarget : this});
        }

        return true;
    };

    Animation.Bind.prototype.blink = function (delay) {
        var last;

        if (this.duration - delay < 0) {
            last = true;
        }

        var vectorId, vectorOffset, step;

        for (vectorId in this.vectors) {
            if (this.vectors.hasOwnProperty(vectorId)) {
                vectorOffset = this.vectors[vectorId];

                step =
                    (last) ?
                        vectorOffset :
                        (vectorOffset / (this.duration / delay));

                this.element[vectorId].value += step;
                this.element[vectorId].apply(this.element);

                this.vectors[vectorId] -= step;
            }
        }

        this.duration = this.duration - delay;

        if (last) {
            this.initAct(++this.act, this.duration);
        }

        return undefined;
    };


   /* Animation worker */

    Animation.worker = function (work) {
        if (!work) {
            if (Animation.worker.already) {
                return undefined;
            }
        }

        Animation.worker.already = true;

        var delay =
            (Animation.worker.last) ?
                (new Date()).getTime() - Animation.worker.last.getTime() :
                1000 / Animation.worker.maxFps,


        pool = Animation.worker.pool,

        poolId, more;

        if (pool.count > 0) {
            for (poolId in pool.pool) {
                if (pool.pool.hasOwnProperty(poolId)) {
                    var bind = pool.pool[poolId];

                    if (bind) {
                        bind.blink(delay);
                    }
                }
            }

            more = true;
        }

        if (more !== true) {
            Animation.worker.already = false;
            delete Animation.worker.last;

            return undefined;
        }

        Animation.worker.last = new Date();

        setTimeout(
            function () {Animation.worker(true);},
            1000 / Animation.worker.maxFps
        );

        return undefined;
    };

    Animation.worker.pool   = new Pool();
    Animation.worker.maxFps = 100;


    /* Event */

    window['incident'] = function (event) {
        if (typeof window['incident'].callback !== 'function') {
            return undefined;
        }

        if (!event) {
            incident = window['event'];
        }

        if (event.type === 'animation_stopped') {
	    if(window['incident'].callbacks.hasOwnProperty(event['currentTarget']['elementId']))
		window['incident'].callbacks[event['currentTarget']['elementId']]['animation_stopped']();
            window['incident'].callback(
                event['currentTarget']['id'], 'animation_stopped'
            );
        }

        var eventGroup =
            (/mouse/).test(event.type) ? 'mouse' :
            (/key/).test(event.type)   ? 'key'   :
                null,

        eventName = window['incident'].correct[event.type];

        if (eventName === undefined) {
            return undefined;
        }

        var elementId, eventData, element;

        switch (eventGroup) {
            case 'mouse':
                elementId = +(/^_(\d+)$/).exec(event['currentTarget']['id'])[1];

                element = Unit.pool.take(elementId);

	        var re_disassemble = /(\d+)px/;
	        var x = event.clientX - re_disassemble.exec(element.html.style.left)[1],
                    y = event.clientY - re_disassemble.exec(element.html.style.top)[1];
	       
                eventData = [{
                        'pointer_id' : 0,

                        'x' : (element.width.unit  === '%') ?
                            (100 / element.width.px().value  * x) :
                            x,

                        'y' : (element.height.unit === '%') ?
                            (100 / element.height.px().value * y) :
			    y
                    }];
            break;
            case 'key':
                elementId = 0;

                eventData = {
                    'key_obj' :
                        {
                            'group_id' : 0, 'keynum' : event.keyCode,
                            'key_modificators' : {}
                        }
                };

                if (event['ctrlKey']) {
                    eventData['key_obj']['key_modificators']['ctrl']  = true;
                }

                if (event['shiftKey']) {
                    eventData['key_obj']['key_modificators']['shift'] = true;
                }

                if (event['metaKey']) {
                    eventData['key_obj']['key_modificators']['alt']   = true;
                }
            break;
            default: return undefined;
        }

        window['incident'].callback(elementId, eventName, eventData);

	if(window['incident'].callbacks.hasOwnProperty(elementId))
	    window['incident'].callbacks[elementId][eventName](eventData);

        return undefined;
    };
		
    window['incident'].callback = function(){}; // a litle hack for not calling events_callback_set if do not need
    window['incident'].callbacks = [];

    window['incident'].correct = {
        'pointer_in'     : 'onmouseover',
        'pointer_out'    : 'onmouseout',
        'pointer_down'   : 'onmousedown',
        'pointer_up'     : 'onmouseup',
        'pointer_motion' : 'onmousemove',

        'key_down'       : 'onkeydown',
        'key_up'         : 'onkeyup',


        'mouseover'      : 'pointer_in',
        'mouseout'       : 'pointer_out',
        'mousedown'      : 'pointer_down',
        'mouseup'        : 'pointer_up',
        'mousemove'      : 'pointer_motion',

        'keydown'        : 'key_down',
        'keyup'          : 'key_up'
    };


    /* Compositer */

    var Compositer = function () {
        var root = Unit.root.init();

        if (typeof root === 'object') {
            root.id(Unit.pool.put(root));

            return undefined;
        } else {
            throw new Error(
                'You can create Compositer object only after load DOM'
            );
        }
    };

    Compositer.prototype['elem_get_geometry'] = function(elemId, px){
        if (typeof elemId !== 'number') {
            return undefined;
        }

        var elem = Unit.pool.take(elemId);

        return {
	    x : px ? elem.x.px().value : elem.x.value,
	    y : px ? elem.y.px().value : elem.y.value,
	    width : px ?  elem.width.px().value : elem.width.value,
	    height : px ? elem.width.px().value : elem.height.value
	};	
    };

    Compositer.prototype['frame_create'] = function (object) {
        var frame = new Unit('frame', object);

        frame.id(Unit.pool.put(frame));

        return frame.id(undefined);
    };

    Compositer.prototype['frame_destroy'] = function (frameId) {
        if (typeof frameId !== 'number') {
            return undefined;
        }

        if (frameId === 0) {
            return undefined;
        }

        Unit.pool.free(frameId);

        return undefined;
    };

    Compositer.prototype['frame_add'] = function (parentId, childId) {
        if (typeof parentId !== 'number' ||
            typeof childId  !== 'number')
        {
            return undefined;
        }

        var parent = Unit.pool.take(parentId),
            child  = Unit.pool.take(childId);

        if (parent === undefined) {
            return undefined;
        }

        if (child  === undefined) {
            return undefined;
        }

        parent.childs.push(child);
        child.parent = parent;

        parent.html.appendChild(child.html);

        var propertyKey;

        for (propertyKey in child.defaults) {
            if (child.defaults.hasOwnProperty(propertyKey)) {
                child[propertyKey].apply(child);
            }
        }

        return undefined;
    };

    Compositer.prototype['frame_remove'] = function (elementId) {
        if (typeof elementId !== 'number') {
            return undefined;
        }

        var element = Unit.pool.take(elementId);

        if (element === undefined) {
            return undefined;
        }

        var parent = element.parent;

        if (parent === undefined) {
            return undefined;
        }

        var child, childs = parent.childs;

	var childs_counter = childs.length - 1;
        while (childs_counter >= 0) {
            child = childs[childs_counter];

            if (child === element) {
		parent.html.removeChild(child.html);
		childs.splice(childs_counter, 1);
                break;
            }
	    childs_counter--;
        }

        delete element.parent;

        return undefined;
    };

    Compositer.prototype['frame_info'] = function () {
        var unitTypeName, valueTypeName, elems = {}, work,
            unitTypes  = Unit.prototype.types,
            valueTypes = Unit.Value.types;

        for (unitTypeName in unitTypes) {
            if (unitTypes.hasOwnProperty(unitTypeName)) {
                elems[unitTypeName] = {};

                for (valueTypeName in valueTypes) {
                    if (valueTypes.hasOwnProperty(valueTypeName)) {
                        work = valueTypes[valueTypeName].prototype.work;

                        if (work === true) {
                            elems[unitTypeName][valueTypeName] = true;
                        }
                    }
                }
            }
        }

        return {
	    perfomance : 'normal',
	    elements : elems
	};
    }

    Compositer.prototype['image_create'] = function (object) {
        var image = new Unit('image', object);

        image.id(Unit.pool.put(image));

        return image.id(undefined);
    };

    Compositer.prototype['image_destroy'] = function (imageId) {
        if (typeof imageId !== 'number') {
            return undefined;
        }

        if (imageId === 0) {
            return undefined;
        }

        Unit.pool.free(imageId);

        return undefined;
    };

    Compositer.prototype['text_create'] = function (object) {
        var text = new Unit('text', object);

        text.id(Unit.pool.put(text));

        return text.id(undefined);
    };

    Compositer.prototype['text_destroy'] = function (textId) {
        if (typeof textId !== 'number') {
            return undefined;
        }

        if (textId === 0) {
            return undefined;
        }

        Unit.pool.free(textId);

        return undefined;
    };

    Compositer.prototype['entry_create'] = function (object) {
        var entry = new Unit('entry', object);

        entry.id(Unit.pool.put(entry));

        return entry.id(undefined);
    };

    Compositer.prototype['entry_get_control'] = function(entryId){
	return Unit.pool.take(entryId).control;
    };

    Compositer.prototype['entry_destroy'] = function (entryId) {
        if (typeof entryId !== 'number') {
            return undefined;
        }

        if (entryId === 0) {
            return undefined;
        }

        Unit.pool.free(entryId);

        return undefined;
    };

    Compositer.prototype['button_create'] = function (object) {
        var button = new Unit('button', object);

        button.id(Unit.pool.put(button));

        return button.id(undefined);
    };

    Compositer.prototype['button_get_control'] = function(buttonId){
	return Unit.pool.take(buttonId).control;
    };

    Compositer.prototype['button_destroy'] = function (buttonId) {
        if (typeof buttonId !== 'number') {
            return undefined;
        }

        if (buttonId === 0) {
            return undefined;
        }

        Unit.pool.free(buttonId);

        return undefined;
    };

    Compositer.prototype['video_create'] = function (object) {
        var video = new Unit('video', object);

        video.id(Unit.pool.put(video));

        return video.id(undefined);
    };

    Compositer.prototype['video_get_control'] = function(videoId){
	return Unit.pool.take(videoId).control;
    };

    Compositer.prototype['video_destroy'] = function (videoId) {
        if (typeof videoId !== 'number') {
            return undefined;
        }

        if (videoId === 0) {
            return undefined;
        }

        Unit.pool.free(videoId);

        return undefined;
    };

    Compositer.prototype['anim_create'] = function (chain) {
        if (typeof chain !== 'object') {
            return undefined;
        }

        var animation = new Animation(chain);

        if (animation.constructor !== Animation) {
            return undefined;
        }

        return Animation.pool.put(animation);
    };

    Compositer.prototype['anim_destroy'] = function (animId) {
        if (typeof animId !== 'number') {
            return undefined;
        }

        var animation = Animation.pool.take(animId);

        if (animation === undefined) {
            return undefined;
        }

        if (animation.binds.count === 0) {
            return undefined;
        }

        Animation.pool.free(animId);

        return undefined;
    };

    Compositer.prototype['anim_bind'] = function (elementId, animationId) {
        if (typeof elementId   !== 'number' ||
            typeof animationId !== 'number')
        {
            return undefined;
        }

        var element   = Unit.pool.take(elementId),
            animation = Animation.pool.take(animationId);

        if (element === undefined || animation === undefined) {
            return undefined;
        }

        var bind = new Animation.Bind(element, animation);
	bind.elementId = elementId;

        animation.binds.put(bind);

        bind.id = Animation.Bind.pool.put(bind);

        return bind.id;
    };

    Compositer.prototype['anim_unbind'] = function (bindId) {
        if (typeof bindId !== 'number') {
            return undefined;
        }

        var bind = Animation.Bind.pool.take(bindId);

        if (bind === undefined) {
            return undefined;
        }

        bind.animation.binds.free(bindId);
        Animation.Bind.pool.free(bindId);

        return undefined;
    };

    Compositer.prototype['anim_start'] = function (bindId) {
        if (typeof bindId !== 'number') {
            return undefined;
        }

        var bind = Animation.Bind.pool.take(bindId);

        if (bind === undefined) {
            return undefined;
        }

        bind.start();

        return undefined;
    };

    Compositer.prototype['anim_stop'] = function (bindId) {
        if (typeof bindId !== 'number') {
            return undefined;
        }

        var bind = Animation.Bind.pool.take(bindId);

        if (bind === undefined) {
            return undefined;
        }

        bind.stop();

        return undefined;
    };

    Compositer.prototype['event_register'] = function (elementId, eventName, callback) {
        if (typeof elementId !== 'number' ||
            typeof eventName !== 'string')
        {
            return undefined;
        }

	if(typeof(callback) != 'undefined'){
	    if(!window['incident'].callbacks.hasOwnProperty(elementId))
		window['incident'].callbacks[elementId] = {};
	    window['incident'].callbacks[elementId][eventName] = callback;	    
	}

        if (eventName === 'animation_stopped') {
            var bind = Animation.Bind.pool.take(elementId);
            if (bind !== undefined) {
                bind.callback = true;
            }

            return undefined;
        }

        eventName = window['incident'].correct[eventName];

        if (eventName === undefined) {
            return undefined;
        }

        if ((/mouse/).test(eventName)) {
            var element = Unit.pool.take(elementId);

            if (element === undefined) {
                return undefined;
            }

            element.html[eventName] = window['incident'];

            return undefined;
        }

        if ((/key/).test(eventName)) {
            document[eventName] = window['incident'];
        }

        return undefined;
    };

    Compositer.prototype['event_unregister'] = function (elementId, eventName) {
        if (typeof elementId !== 'number') {
            return undefined;
        }

        if (typeof eventName !== 'string') {
            return undefined;
        }
 
	if(window['incident'].callbacks[elementId].hasOwnProperty('eventName'))
	   delete window['incident'].callbacks[elementId][eventName];

	var element;

        if (eventName === 'animation_stopped') {
            element = Animation.Bind.pool.take(elementId);

            if (element === undefined) {
                return undefined;
            }

            delete element.callback;

            return undefined;
        }

        element = Unit.pool.take (elementId);

        if (element === undefined) {
            return undefined;
        }

        eventName = event.correct[eventName];

        if (eventName === undefined) {
            return undefined;
        }

        if ((/mouse/).test(eventName)) {
            delete element.html[eventName];

            return undefined;
        }

        if ((/key/).test(eventName)) {
            delete document[eventName];
        }

        return undefined;
    };

    Compositer.prototype['events_callback_set'] = function (callback) {
        window['incident'].callback = callback;

        return undefined;
    };

    return { Compositer : Compositer, Unit : Unit };
}());

if(typeof(require) != 'undefined'){
    exports.create = function(){ return new comp.Compositer();}
    exports.Compositer = comp.Compositer;
    exports.Unit = comp.Unit;
} else
    window['Compositer'] = comp.Compositer;

