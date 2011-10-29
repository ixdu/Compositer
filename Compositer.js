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

  version 0.5
*/

/* Compositer */
(function () {

    /* Universal method to take window size in different browsers */

    var WSSize = function () {
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

    var Element = function () {};

    Element.pool = new Pool();

    Element.prototype.id = function (id) {
        if (typeof id != 'number') {
            var parseResult = (/^_(\d+)$/).exec(this.html.id);

            if (parseResult != null) {
                return +parseResult[1];
            }
        } else {
            this.html.id = '_' + id;

            return undefined;
        }
    };

    Element.prototype.init = function (object) {
        this.html.style.position = 'fixed';
        this.html.style.margin   = '0px';
        this.html.style.padding  = '0px';

        var value, propertyName;

        for (propertyName in this.defaults) {
            value = new Element.Value(object[propertyName], propertyName);

            if (value.constructor != Element.Value || value.check() === false) {
                value = new Element.Value(this.defaults[propertyName]);
            }

            this[propertyName] = value;

            value.apply(this);
        }

        return undefined;
    };

    Element.prototype.defaults = {
        width   : {type : 'width',   value : 100, unit : '%'},
        height  : {type : 'height',  value : 100, unit : '%'},
        x       : {type : 'x',       value : 0,   unit : 'px'},
        y       : {type : 'y',       value : 0,   unit : 'px'},
        z_index : {type : 'z_index', value : 1}
    };


    /* Frame element */

    Element.Frame = function (object) {
        this.childs = [];

        this.html = document.createElement('div');

        if (typeof object != 'object') {
            object = {};
        }

        this.init(object);
    };

    Element.Frame.prototype = new Element();


    /* Image element */

    Element.Image = function (object) {
        this.html = document.createElement('img');

        if (typeof object != 'object') {
            object = {};
        }

        if (typeof object.source === 'string') {
            this.html.src = object.source;
        }

        this.html.alt = '';

        this.init(object);
    };

    Element.Image.prototype = new Element();


    /* Root */

    Element.root = new Element();

    Element.root.init = function () {
        if (typeof document.body != 'object' || typeof WSSize() != 'object') {
            return false;
        }

        this.html = document.body;

        this.html.innerHtml = '';

        this.html.style.position = 'fixed';
        this.html.style.margin   = '0px';
        this.html.style.padding  = '0px';

        var value, propertyName;

        for (propertyName in this.defaults) {
            value = new Element.Value(this.defaults[propertyName]);

            this[propertyName] = value;

            value.apply(this);
        }

        var root = this, childKey, propertyKey;

        window.onresize = function () {
            root.width.value  = WSSize().width;
            root.height.value = WSSize().height;

            root.width.apply(root); root.height.apply(root);

            var childKey, child, propertyKey;

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

    Element.root.defaults = {
        width   : {type : 'width',   value : WSSize().width,  unit : 'px'},
        height  : {type : 'height',  value : WSSize().height, unit : 'px'},
        x       : {type : 'x',       value : 0,               unit : 'px'},
        y       : {type : 'y',       value : 0,               unit : 'px'},
        z_index : {type : 'z_index', value : 1}
    };


    /* Value */

    Element.Value = function (value, type) {
        var valueType =
            (typeof value === 'object') ? 'declaration' :
            (typeof value === 'string') ? 'inline'      : null;

        if (valueType === 'inline' && typeof type != 'string') {
            return {};
        }

        switch (valueType) {
            case 'declaration':
                value.value += 0;

                this.value =
                    (typeof value.value === 'number')
                        ? value.value : 0;

                this.unit  =
                    (typeof value.unit === 'string')
                        ? value.unit : null;

                this.type  = value.type;

                break;
            case 'inline':
                if (this.dissassemble(value, type) === false) {
                    return {};
                }

                break;
            default: return {};
        }
    };

    Element.Value.prototype.dissassemble = function(input, type) {
        if (typeof type != 'string') {
            return false;
        }

        var parseResult = (/([+,-]?\d+\.?\d*)(\D*)/).exec(input);

        if (parseResult === null) {
            return false;
        }

        this.value = +parseResult[1];
        this.unit  =  parseResult[2];
        this.type  =  type;

        if (this.value === undefined) {
            this.value = 0;
        }

        if (this.unit === '')  {
            this.unit = null;
        }

        return true;
    };

    Element.Value.prototype.assemble = function (roundValue) {
        var value = (roundValue === true) ? Math.round(this.value) : this.value;
        var unit  = (this.unit  === null) ? ''                     : this.unit;

        return value + unit;
    };

    Element.Value.prototype.apply = function (target) {
        if (typeof target != 'object') {
            return false;
        }

        target.html.style[this.correct[this.type]] =
            (this.unit === '%')
                ? this.px(target, true).assemble(true)
                : this.assemble();

        var childKey, child;

        for (childKey in target.childs) {
            child = target.childs[childKey];
            child[this.type].apply(child);
        }

        return true;
    };

    Element.Value.prototype.px = function (context, recalc) {
        if (this.unit === 'px') {
            return this;
        }

        if  (this.type != 'width' && this.type != 'height' &&
             this.type != 'x'     && this.type != 'y')
        {
            return undefined;
        }

        if (recalc != true && typeof this.cache === 'object') {
            return this.cache;
        }

        var parent = context.parent, value;

        value = (parent)
                    ? (this.type === 'width' || this.type === 'height')
                        ? parent[this.type].px(parent).value / 100 * this.value
                        :
                            parent[this.type].px(parent).value +
                            parent[
                                (this.type === 'x') ? 'width' : 'height'
                            ].px(parent).value / 100 * this.value
                    : 0

        this.cache = new Element.Value({
            type  : this.type,
            value : value,
            unit  : 'px'
        });

        return this.cache;
    };

    Element.Value.prototype.correct = {
        width   : 'width',
        height  : 'height',
        x       : 'left',
        y       : 'top',
        z_index : 'zIndex'
    };

    Element.Value.prototype.rules = {};

    Element.Value.prototype.check = function () {
        return true;
    };


    /* Animation */

    var Animation = function (chain) {
        if (!this.init(chain)) {
            return {};
        }
    };

    Animation.pool = new Pool;

    Animation.prototype.init = function(chain) {
        if (
            chain === undefined        ||
            chain.constructor != Array ||
            chain.length < 1
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

            this.stop()

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
        if (this.duration - delay < 0) {
            var last = true;
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
                : 1000 / arguments.callee.maxFps;


        var pool = arguments.callee.pool;

        if (pool.count > 0) {
            for (var poolId in pool.pool) {
                var bind = pool.pool[poolId];

                if (bind) bind.blink(delay);
            }

            var more = true;
        }

        if (more != true) {
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
        if (typeof arguments.callee.callback != 'function') {
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
                null;

        var eventName = arguments.callee.correct[event.type];

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
                    key_obj : {group_id : 0, keynum : event.keyCode}
                };
            break;
            default: return undefined;
        }

        arguments.callee.callback(elementId, eventName, eventData);

        return undefined;
    }

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
    }


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

    Compositer.prototype = {

            frame_create : (function (object) {
                var frame = new Element.Frame(object);

                frame.id(Element.pool.put(frame));

                return frame.id();
            }),

            frame_destroy : (function (frameId) {
                if (typeof frameId != 'number') {
                    return undefined;
                }

                if (frameId === 0) {
                    return undefined;
                }

                Element.pool.free(frameId);

                return undefined;
            }),


                frame_add : (function (parentId, childId) {
                    if (typeof parentId != 'number' ||
                        typeof childId  != 'number')
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

                    for (var propertyKey in child.defaults) {
                        child[propertyKey].apply(child);
                    }

                    return undefined;
                }),

                frame_remove : (function (frameId) {
                    if (typeof frameId != 'number') {
                        return undefined;
                    }

                    var element = Element.pool.take(frameId);

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
                }),


            image_create : (function (object) {
                var image = new Element.Image(object);

                image.id(Element.pool.put(image));

                return image.id();
            }),

            image_destroy : (function (imageId) {
                if (typeof imageId != 'number') {
                    return undefined;
                }

                if (imageId === 0) {
                    return undefined;
                }

                Element.pool.free(imageId);

                return undefined;
            }),


        anim_create : (function (chain) {
            if (typeof chain != 'object') {
                return undefined;
            }

            var animation = new Animation(chain);

            if (animation.constructor != Animation) {
                return undefined;
            }

            return Animation.pool.put(animation);
        }),

        anim_destroy : (function (animId) {
            if (typeof animId != 'number') {
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
        }),


            anim_bind : (function(elementId, animationId) {
                if (typeof elementId   != 'number' ||
                    typeof animationId != 'number')
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
            }),

            anim_unbind : (function (bindId) {
                if (typeof bindId != 'number') {
                    return undefined;
                }

                var bind = Animation.Bind.pool.take(bindId);

                if (bind === undefined) {
                    return undefined;
                }

                bind.animation.binds.free(bindId);
                Animation.Bind.pool.free(bindId);

                return undefined;
            }),


            anim_start : (function (bindId) {
                if (typeof bindId != 'number') {
                    return undefined;
                }

                var bind = Animation.Bind.pool.take(bindId);

                if (bind === undefined) {
                    return undefined;
                }

                bind.start();

                return undefined;
            }),

            anim_stop : (function (bindId) {
                if (typeof bindId != 'number') {
                    return undefined;
                }

                var bind = Animation.Bind.pool.take(bindId);

                if (bind === undefined) {
                    return undefined;
                }

                bind.stop();

                return undefined;
            }),


        event_register : (function (elementId, eventName) {
            if (typeof elementId != 'number' ||
                typeof eventName != 'string')
            {
                return undefined;
            }

            if (eventName === 'animation_stopped') {
                var bind = Animation.Bind.pool.take(elementId);

                if (bind != undefined) {
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
        }),

        event_unregister : (function (elementId, eventName) {
            if (typeof elementId != 'number') {
                return undefined;
            }

            if (typeof elementName != 'string') {
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
        }),

        events_callback_set : (function (callback) {
            event.callback = callback;

            return undefined;
        })
    };
})();
