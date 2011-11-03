/*
  shared objects for client and server implementations of dsa
  Copyright (C) 2011  Alexey Bagin aka freeze (email freeze@2du.ru)

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

  version 0.7.3
*/

/* Compositer */
(function () {

    /* Universal method to take window size in different browsers */

    var wsSize = function () {
        switch (arguments.callee.way) {
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
            case 4:
                throw new Error(
                    'Can not detect window size in this browser'
                );
            default:
                arguments.callee.way =
                    (window.innerWidth
                        && window.innerHeight) ? 1 :
                    (document.body
                        && document.body.clientWidth
                        && document.body.clientHeight) ? 2 :
                    (document.documentElement
                        && document.documentElement.clientWidth
                        && document.documentElement.clientHeight) ? 3 : 4;

                return arguments.callee();
        }
    };


    /* Pool */

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


    /* Element */

    var Element = function (type, object) {
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

    Element.pool = new Pool();

    Element.prototype.id = function (id) {
        var parseResult;

        if (typeof id !== 'number') {
            parseResult = (/^_(\d+)$/).exec(this.html.id);

            if (parseResult !== null) {
                return +parseResult[1];
            }
        } else {
            this.html.id = '_' + id;

            return undefined;
        }
    };

    Element.prototype.prepare = function (object) {
        this.html.style.position = 'fixed';
        this.html.style.margin   = '0px';
        this.html.style.padding  = '0px';

        var value, propertyName;

        for (propertyName in this.defaults) {
            if (typeof object[propertyName] === 'string') {
                value = new Element.Value(object[propertyName], propertyName);
            } else {
                value = new Element.Value(this.defaults[propertyName]);
            }

            this[propertyName] = value;

            value.apply(this);
        }

        return undefined;
    };

    Element.prototype.defaults = {
        width   : {type : 'width',   value : 100, unit : '%'  },
        height  : {type : 'height',  value : 100, unit : '%'  },
        x       : {type : 'x',       value : 0,   unit : 'px' },
        y       : {type : 'y',       value : 0,   unit : 'px' },
        z_index : {type : 'z_index', value : 1                },
        opacity : {type : 'opacity', value : 0,   unit : '%'  },
        rotate  : {type : 'rotate',  value : 0,   unit : 'deg'}
    };


    /* Element types */

    Element.prototype.types = {};


    /* Frame element */

    Element.prototype.types.frame = function (object) {
        this.childs = [];

        this.html = document.createElement('div');

        this.init(object);
        this.prepare(object);
    };

    Element.prototype.types.frame.prototype = new Element();

    Element.prototype.types.frame.prototype.init = function (object) {
        if (typeof object.color === 'string') {
            this.html.style.backgroundColor = object.color;
        }
    }

    /* Image element */

    Element.prototype.types.image = function (object) {
        this.html = document.createElement('img');

        this.init(object);

        this.prepare(object);
    };

    Element.prototype.types.image.prototype = new Element();

    Element.prototype.types.image.prototype.init = function (object) {
        if (typeof object.source === 'string') {
            this.html.src = object.source;
        }

        this.html.alt = '';
    };


    /* Text element */

    Element.prototype.types.text = function (object) {
        this.html = document.createElement('span');

        this.html.style.fontFamily = 'monospace';
        this.html.style.textAlign  = 'center';
        this.html.style.whiteSpace = 'pre';

        this.init(object);

        this.prepare(object);
    };

    Element.prototype.types.text.prototype = new Element();

    Element.prototype.types.text.prototype.init = function (object) {
        if (typeof object.text === 'string') {
            this.html.innerHTML = object.text;
        }

        if (typeof object.color === 'string') {
            this.html.style.color = object.color;
        }
    };

    Element.prototype.types.text.prototype.resized = function () {
        if (typeof this.width !== 'object' || typeof this.height !== 'object') {
            return undefined;
        }

        this.fontSize(this);
    };

    Element.prototype.types.text.prototype.fontSize = function (target) {
        if (arguments.callee.init.already === undefined) {
            arguments.callee.init();
        }

        var string = target.html.innerHTML,

            width  = target.width.px().value,
            height = target.height.px().value,

            widthWeight = arguments.callee.widthWeight,

            font   = {
                width  : width / string.length * widthWeight,
                height : height
            },

            fontSize = (font.width < font.height) ? font.width : font.height;

        target.html.style.fontSize   = fontSize + 'px';
        target.html.style.lineHeight = height   + 'px';
    };

    Element.prototype.types.text.prototype.fontSize.init = function () {
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

        arguments.callee.already = true;
    };


    /* Root element */

    Element.root = new Element();

    Element.root.init = function () {
        if (typeof document.body !== 'object' || typeof wsSize() !== 'object') {
            return false;
        }

        this.html = document.body;

        this.html.innerHtml = '';

        this.prepare({});

        var root = this, childKey, propertyKey, child;

        window.onresize = function () {
            root.width.value  = wsSize().width;
            root.height.value = wsSize().height;

            root.width.apply(root); root.height.apply(root);

            for (childKey in root.childs) {
                child = root.childs[childKey];

                for (propertyKey in child.defaults) {
                    child[propertyKey].apply(child);
                }
            }
        };

        return this;
    };

    Element.root.childs = [];


    /* Value */

    Element.Value = function (value, type) {
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

    Element.Value.prototype.dissassemble = function (input) {
        var parseResult = (/([+,-]?\d+\.?\d*)(\D*)/).exec(input);

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

    Element.Value.prototype.group = function () {
        var propertyGroup =
            (this.type === 'width' || this.type === 'height') ? 'size'     :
            (this.type === 'x'     || this.type === 'y'     ) ? 'position' :
            'other';

        return propertyGroup;
    };

    Element.Value.prototype.apply = function (target) {
        var group = this.group(),

        unit = (this.unit === null) ? '%' : this.unit,
        type = (unit === 'px') ? this : this.px(target, true),

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
            child = target.childs[childKey];
            child[this.type].apply(child);
        }

        return undefined;
    };

    Element.Value.prototype.px = function (context, recalc) {
        if (this.unit === 'px') {
            return this;
        }

        if (recalc !== true && typeof this.cache === 'object') {
            return this.cache;
        }

        var group = this.group();

        if (group === 'other') {
            return undefined;
        }

        var parent = context.parent,

        value =
            (typeof parent === 'object')
                ? (group === 'size')
                    ? parent[this.type].px(parent).value / 100 * this.value
                    :
                        parent[this.type].px(parent).value +
                        parent[
                            (this.type === 'x') ? 'width' : 'height'
                        ].px(parent).value / 100 * this.value
                : (this.type === 'x' || this === 'y') ? 0 :
                    (this.type === 'width') ? wsSize().width : wsSize().height;

        this.cache = new Element.Value({
            type  : this.type,
            value : value,
            unit  : 'px'
        });

        return this.cache;
    };

    Element.Value.prototype.correct = {
        width  : 'width',
        height : 'height',
        x      : 'left',
        y      : 'top'
    };


    /* Value types */

    Element.Value.prototype.types = {};


    /* Width type */

    Element.Value.prototype.types.width = function () {};
    Element.Value.prototype.types.width.prototype = new Element.Value();


    /* Height type */

    Element.Value.prototype.types.height = function () {};
    Element.Value.prototype.types.height.prototype = new Element.Value();


    /* X type */

    Element.Value.prototype.types.x = function () {};
    Element.Value.prototype.types.x.prototype = new Element.Value();


    /* Y Type */

    Element.Value.prototype.types.y = function () {};
    Element.Value.prototype.types.y.prototype = new Element.Value();


    /* Z-index type */

    Element.Value.prototype.types.z_index = function () {};
    Element.Value.prototype.types.z_index.prototype = new Element.Value();

    Element.Value.prototype.types.z_index.prototype.apply = function (target) {
        target.html.style.zIndex = Math.round(this.value);
    };


    /* Opacity type */

    Element.Value.prototype.types.opacity = function () {};
    Element.Value.prototype.types.opacity.prototype = new Element.Value();

    Element.Value.prototype.types.opacity.prototype.apply = function (target) {
        if (arguments.callee.work === false) {
            return undefined;
        }

        var opacity = 1 - (Math.abs(this.value) / 100);

        opacity = (opacity < 0) ? 0 : opacity;

        target.html.style.opacity = opacity;

        if (arguments.callee.work === undefined) {

            if (+target.html.style.opacity === opacity) {
                arguments.callee.work = true;
            } else {
                arguments.callee.work = false;

                return undefined;
            }
        }

        return undefined;
    };


    /* Rotate type */

    Element.Value.prototype.types.rotate = function () {};
    Element.Value.prototype.types.rotate.prototype = new Element.Value();

    Element.Value.prototype.types.rotate.prototype.apply = function (target) {
        if (arguments.callee.prefix === null) {
            return undefined;
        }

        var rotate = Math.round(this.value);

        var value = 'rotate(' + rotate + 'deg)';

        if (arguments.callee.prefix === undefined) {
            var list = ['Moz', 'Webkit', 'O', 'ms'];

            for (var prefixKey in list) {
                var prefix = list[prefixKey];

                if (target.html.style[prefix + 'Transform'] != undefined) {
                    arguments.callee.prefix = prefix;

                    var found = true;

                    break;
                }
            }

            if (!found) {
                arguments.callee.prefix = null;

                return undefined;
            }
        }

        if (arguments.callee.prefix === 'ms') {
            target.html.style[arguments.callee.prefix + 'Transform'] = '';
        }

        target.html.style[arguments.callee.prefix + 'Transform'] = value;
    };


    /* Animation */

    var Animation = function (chain) {
        if (!this.init(chain)) {
            return {};
        }
    };

    Animation.pool = new Pool();

    Animation.prototype.init = function(chain) {
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

    Animation.Bind = function(element, animation) {
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
        this.initAct(this.act);

        return true;
    };

    Animation.Bind.prototype.initAct = function (actId, late) {
        var act = this.animation.acts[actId];

        if (act === undefined) {
            this.act = 0;
            this.initAct(this.act);

            this.stop();

            return undefined;
        }

        this.duration =
            (act.duration) ? act.duration + ((late) ? late : 0) : 0;

        this.vectors = {};

        var actionName;

        for (actionName in act.actions) {
            this.vectors[actionName] = act.actions[actionName];
        }

        return true;
    };

    Animation.Bind.prototype.start = function () {
        this.workerPoolId = Animation.worker.pool.put(this);

        Animation.worker();
    };

    Animation.Bind.prototype.stop = function () {
        if (this.workerPoolId === undefined) {
            return false;
        }

        Animation.worker.pool.free(this.workerPoolId);

        if (this.callback) {
            event({type : 'animation_stopped', currentTarget : this});
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
            vectorOffset = this.vectors[vectorId];

            step =
                (last)
                    ? vectorOffset
                    : (vectorOffset / (this.duration / delay));

            this.element[vectorId].value += step;
            this.element[vectorId].apply(this.element);

            this.vectors[vectorId] -= step;
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
            if (arguments.callee.already) {
                return undefined;
            }
        }

        arguments.callee.already = true;

        var delay =
            (arguments.callee.last)
                ? (new Date()).getTime() - arguments.callee.last.getTime()
                : 1000 / arguments.callee.maxFps,


        pool = arguments.callee.pool,

        poolId, more;

        if (pool.count > 0) {
            for (poolId in pool.pool) {
                var bind = pool.pool[poolId];

                if (bind) {
                    bind.blink(delay);
                }
            }

            more = true;
        }

        if (more !== true) {
            arguments.callee.already = false;
            delete arguments.callee.last;

            return undefined;
        }

        arguments.callee.last = new Date();

        setTimeout(
            function() {Animation.worker(true);},
            1000 / arguments.callee.maxFps
        );

        return undefined;
    };

    Animation.worker.pool   = new Pool();
    Animation.worker.maxFps = 100;


    /* Event */

    var event = function event (event) {
        if (typeof arguments.callee.callback !== 'function') {
            return undefined;
        }

        if (!event) {
            event = window.event;
        }

        if (event.type === 'animation_stopped') {
            arguments.callee.callback(
                event.currentTarget.id, 'animation_stopped'
            );
        }

        var eventGroup =
            (/mouse/).test(event.type) ? 'mouse' :
            (/key/).test(event.type)   ? 'key'   :
                null,

        eventName = arguments.callee.correct[event.type];

        if (eventName === undefined) {
            return undefined;
        }

        var elementId, eventData, element;

        switch (eventGroup) {
            case 'mouse':
                elementId = +(/^_(\d+)$/).exec(event.currentTarget.id)[1];

                element = Element.pool.take(elementId);

                eventData = {
                    group_id    : 0,
                    pointer_obj : [{
                        pointer_id : 0,

                        x : (element.width.unit  === '%')
                            ? (100 / element.width.px().value  * event.layerX)
                            : event.layerX,

                        y : (element.height.unit === '%')
                            ? (100 / element.height.px().value * event.layerY)
                            : event.layerY
                    }]
                };
            break;
            case 'key':
                elementId = 0;

                eventData = {
                    key_obj :
                        {
                            group_id : 0, keynum : event.keyCode,
                            key_modificators : {}
                        }
                };

                if (event.ctrlKey) {
                    eventData.key_obj.key_modificators.ctrl  = true;
                }

                if (event.shiftKey) {
                    eventData.key_obj.key_modificators.shift = true;
                }

                if (event.metaKey) {
                    eventData.key_obj.key_modificators.alt   = true;
                }
            break;
            default: return undefined;
        }

        arguments.callee.callback(elementId, eventName, eventData);

        return undefined;
    };

    event.correct = {
        pointer_in     : 'onmouseover',
        pointer_out    : 'onmouseout',
        pointer_down   : 'onmousedown',
        pointer_up     : 'onmouseup',
        pointer_motion : 'onmousemove',

        key_down       : 'onkeydown',
        key_up         : 'onkeyup',


        mouseover      : 'pointer_in',
        mouseout       : 'pointer_out',
        mousedown      : 'pointer_down',
        mouseup        : 'pointer_up',
        mousemove      : 'pointer_motion',

        keydown        : 'key_down',
        keyup          : 'key_up'
    };


    /* Compositer */

    Compositer = function () {
        var root = Element.root.init();

        if (typeof root === 'object') {
            root.id(Element.pool.put(root));

            return undefined;
        } else {
            throw new Error(
                'You can create Compositer object only after load DOM'
            );
        }
    };

    Compositer.prototype.frame_create = function (object) {
        var frame = new Element('frame', object);

        frame.id(Element.pool.put(frame));

        return frame.id();
    };

    Compositer.prototype.frame_destroy = function (frameId) {
        if (typeof frameId !== 'number') {
            return undefined;
        }

        if (frameId === 0) {
            return undefined;
        }

        Element.pool.free(frameId);

        return undefined;
    };

    Compositer.prototype.frame_add = function (parentId, childId) {
        if (typeof parentId !== 'number' ||
            typeof childId  !== 'number')
        {
            return undefined;
        }

        var parent = Element.pool.take(parentId),
            child  = Element.pool.take(childId);

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
            child[propertyKey].apply(child);
        }

        return undefined;
    };

    Compositer.prototype.frame_remove = function (elementId) {
        if (typeof elementId !== 'number') {
            return undefined;
        }

        var element = Element.pool.take(elementId);

        if (element === undefined) {
            return undefined;
        }

        var parent = element.parent;

        if (parent === undefined) {
            return undefined;
        }

        var childKey, child;

        for (childKey in parent) {
            child = parent[childKey];

            if (child === element) {
                delete parent[childKey];

                break;
            }
        }

        delete element.parent;

        return undefined;
    };

    Compositer.prototype.image_create = function (object) {
        var image = new Element('image', object);

        image.id(Element.pool.put(image));

        return image.id();
    };

    Compositer.prototype.image_destroy = function (imageId) {
        if (typeof imageId !== 'number') {
            return undefined;
        }

        if (imageId === 0) {
            return undefined;
        }

        Element.pool.free(imageId);

        return undefined;
    };

    Compositer.prototype.text_create = function (object) {
        var text = new Element('text', object);

        text.id(Element.pool.put(text));

        return text.id();
    };

    Compositer.prototype.text_destroy = function (textId) {
        if (typeof textId !== 'number') {
            return undefined;
        }

        if (textId === 0) {
            return undefined;
        }

        Element.pool.free(textId);

        return undefined;
    };

    Compositer.prototype.anim_create = function (chain) {
        if (typeof chain !== 'object') {
            return undefined;
        }

        var animation = new Animation(chain);

        if (animation.constructor !== Animation) {
            return undefined;
        }

        return Animation.pool.put(animation);
    };

    Compositer.prototype.anim_destroy = function (animId) {
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

    Compositer.prototype.anim_bind = function(elementId, animationId) {
        if (typeof elementId   !== 'number' ||
            typeof animationId !== 'number')
        {
            return undefined;
        }

        var element   = Element.pool.take(elementId),
            animation = Animation.pool.take(animationId);

        if (element === undefined || animation === undefined) {
            return undefined;
        }

        var bind = new Animation.Bind(element, animation);

        animation.binds.put(bind);

        bind.id = Animation.Bind.pool.put(bind);

        return bind.id;
    };

    Compositer.prototype.anim_unbind = function (bindId) {
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

    Compositer.prototype.anim_start = function (bindId) {
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

    Compositer.prototype.anim_stop = function (bindId) {
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

    Compositer.prototype.event_register = function (elementId, eventName) {
        if (typeof elementId !== 'number' ||
            typeof eventName !== 'string')
        {
            return undefined;
        }

        if (eventName === 'animation_stopped') {
            var bind = Animation.Bind.pool.take(elementId);

            if (bind !== undefined) {
                bind.callback = true;
            }

            return undefined;
        }

        eventName = event.correct[eventName];

        if (eventName === undefined) {
            return undefined;
        }

        if ((/mouse/).test(eventName)) {
            var element = Element.pool.take(elementId);

            if (element === undefined) {
                return undefined;
            }

            element.html[eventName] = event;

            return undefined;
        }

        if ((/key/).test(eventName)) {
            document[eventName] = event;
        }

        return undefined;
    };

    Compositer.prototype.event_unregister = function (elementId, eventName) {
        if (typeof elementId !== 'number') {
            return undefined;
        }

        if (typeof eventName !== 'string') {
            return undefined;
        }

        var element;

        if (eventName === 'animation_stopped') {
            element = Animation.Bind.pool.take(elementId);

            if (element === undefined) {
                return undefined;
            }

            delete element.callback;

            return undefined;
        }

        element = Element.pool.take (elementId);

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

    Compositer.prototype.events_callback_set = function (callback) {
        event.callback = callback;

        return undefined;
    };
}());
