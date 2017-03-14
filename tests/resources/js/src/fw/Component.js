/**
 * An empty component that may contain other components (comparable to a div html element).
 * @constructor
 * @abstract
 */
var Component = function(stage) {

    /**
     * The global id. May be used by c++ addons.
     * @type {number}
     */
    this.id = Stage.componentId++;

    /**
     * The update component lightweight object.
     * @type {UComponent}
     */
    this.uComponent = stage.adapter.getUComponentContext().createUComponentForComponent(this);

    /**
     * The stage that this component belongs to.
     * @type {Stage}
     */
    this.stage = stage;

    /**
     * A component is active if it is a descendant of the stage root, and if it is visible.
     * @type {boolean}
     */
    this.active = false;

    /**
     * @type {Component}
     */
    this.parent = null;

    /**
     * Flag to quickly check if this component has children.
     * @type {boolean}
     */
    this.hasChildren = false;

    this._clipping = false;

    this._displayedTexture = null;

    // Cache width & height, only maintained when component is active.
    this._renderWidth = 0;
    this._renderHeight = 0;

    /**
     * Flag that indicates if this component has borders at all.
     * @type {boolean}
     */
    this.hasBorders = false;

    /**
     * 'Normal' children.
     * @type {Component[]}
     */
    this.children = [];

    /**
     * Color tint of this sprite.
     * @type {number}
     */
    this._colorTopLeft = 0xffffffff;
    this._colorTopRight = 0xffffffff;
    this._colorBottomLeft = 0xffffffff;
    this._colorBottomRight = 0xffffffff;

    /**
     * The transitions (indexed by property index, null if not used).
     * @type {Transition[]}
     */
    this.transitions = null;

    /**
     * Tags that can be used to identify/search for a specific component.
     * @type {Set}
     */
    this._tags = null;

    /**
     * The tree's tags mapping.
     * This contains all components for all known tags, at all times.
     * @type {Map}
     * @private
     */
    this._treeTags = null;

    /**
     * Holds, per tag, the last frame number that the treeTags were updated.
     * Frame numbers are only registered if the tag key was added manually.
     * @type {Map}
     */
    this._treeTagsUpdatedFrame = null;

    this._x = 0;
    this._y = 0;
    this._w = 0;
    this._h = 0;
    this._scaleX = 1;
    this._scaleY = 1;
    this._pivotX = 0.5;
    this._pivotY = 0.5;
    this._mountX = 0;
    this._mountY = 0;
    this._alpha = 1;
    this._rotation = 0;
    this._borderWidthTop = 0;
    this._borderWidthBottom = 0;
    this._borderWidthLeft = 0;
    this._borderWidthRight = 0;
    this._borderColorTop = 0xffffffff;
    this._borderColorBottom = 0xffffffff;
    this._borderColorLeft = 0xffffffff;
    this._borderColorRight = 0xffffffff;
    this._visible = true;

    /**
     * Manages text rendering for this component. Lazy loaded.
     * @type {ComponentText}
     */
    this.textRenderer = null;

    /**
     * The texture that is currently set.
     * This is changed when changing the src and should never be changed manually.
     * @type {Texture}
     */
    this._texture = null;

    /**
     * The currently displayed texture. While this.texture is loading, this one may be different.
     * @type {Texture}
     */
    this.displayedTexture = this._displayedTexture = null;

    // The texture source.
    this._src = null;

    /**
     * If true, this component is being 'clipped' around the edges. For non-sprite components, the width and height
     * must be explicitly set.
     * @type {boolean}
     */
    this.clipping = false;

    /**
     * The z-index, which determines the rendering order (in the same way as in HTML). 0 = no z-index.
     * @type {number}
     */
    this._zIndex = 0;

    /**
     * If true, this component always behaves as a z-index context. Z-indexed descendants will never be rendered
     * outside of this context.
     * @type {boolean}
     */
    this._forceZIndexContext = false;

    /**
     * This function is called when this component becomes active.
     * @type {Function}
     */
    this.notifyActivate = null;

    /**
     * This function is called when this component becomes inactive.
     * @type {Function}
     */
    this.notifyDeactivate = null;

    /**
     * The cached rotation value (because cos and sin are slow).
     * @type {number}
     */
    this.rotationCache = 0;
    this._sr = 0;
    this._cr = 1;

};

Component.prototype.setParent = function(parent) {
    if (this.parent === parent) return;

    var tags = null;
    var n = 0;
    if (this._treeTags) {
        tags = Utils.iteratorToArray(this.treeTags.keys());
        n = tags.length;
    }
    var i, p;
    var tagSet, parentTreeTags;

    if (this.parent) {
        this.parent.hasChildren = (this.parent.children.length > 1);
        if (n > 0) {
            for (i = 0; i < n; i++) {
                tagSet = this.treeTags.get(tags[i]);

                // Remove from treeTags.
                p = this;
                while (p = p.parent) {
                    parentTreeTags = p.treeTags.get(tags[i]);

                    var changed = false;
                    tagSet.forEach(function(comp) {
                        changed = true;
                        parentTreeTags.delete(comp);
                    });

                    if (changed && p.treeTagsUpdatedFrame.has(tags[i])) {
                        p.treeTagsUpdatedFrame.set(tags[i], this.stage.frameCounter);
                    }
                }
            }
        }
    }

    this.parent = parent;

    if (parent) {
        // Alpha, transform, translate.
        this.uComponent.recalc = true;

        parent.hasChildren = true;

        if (n > 0) {
            // Add to treeTags.
            for (i = 0; i < n; i++) {
                tagSet = this.treeTags.get(tags[i]);

                p = this;
                while (p = p.parent) {
                    if (!p.treeTags.has(tags[i])) {
                        var s = new Set();
                        p.treeTags.set(tags[i], s);
                    }
                    parentTreeTags = p.treeTags.get(tags[i]);

                    tagSet.forEach(function(comp) {
                        parentTreeTags.add(comp);
                    });
                }
            }
        }
    }

    this.updateActiveFlag();
};

Component.prototype.addChild = function (child) {
    if (child.parent === this && this.children.indexOf(child) >= 0) {
        return child;
    }
    return this.addChildAt(child, this.children.length);
};

Component.prototype.addChildren = function (children) {
    var i, n = children.length;
    for (i = 0; i < n; i++) {
        this.addChild(children[i]);
    }
};

Component.prototype.setChildren = function (children) {
    this.removeChildren();
    this.addChildren(children);
};

Component.prototype.addChildAt = function (child, index) {
    // prevent adding self as child
    if (child === this) {
        return child;
    }

    if (index >= 0 && index <= this.children.length) {
        if (child.parent === this && this.children.indexOf(child) === index) {
            // Ignore.
        } else {
            if (child.parent) {
                var p = child.parent;
                p.removeChild(child);
            }

            child.setParent(this);
            this.children.splice(index, 0, child);

            // Sync.
            this.uComponent.insertChild(index, child.uComponent);
        }

        return child;
    } else {
        throw new Error(child + 'addChildAt: The index '+ index +' supplied is out of bounds ' + this.children.length);
    }
};

Component.prototype.getChildIndex = function (child) {
    return this.children.indexOf(child);
};

Component.prototype.removeChild = function (child) {
    var index = this.children.indexOf(child);

    if (index === -1) {
        return;
    }

    return this.removeChildAt(index);
};

Component.prototype.removeChildAt = function (index) {
    var child = this.children[index];

    child.setParent(null);
    this.children.splice(index, 1);

    // Sync.
    this.uComponent.removeChild(index);

    return child;
};

Component.prototype.removeChildren = function() {
    var n = this.children.length;
    if (n) {
        for (var i = 0; i < n; i++) {
            var child = this.children[i];
            child.setParent(null);
        }
        this.children.splice(0, n);

        // Sync.
        this.uComponent.clearChildren();
    }
};

Component.prototype.getDepth = function() {
    var depth = 0;

    var p = this;
    do {
        depth++;
        p = p.parent;
    } while(p);

    return depth;
};

Component.prototype.getAncestor = function(l) {
    var p = this;
    while(l > 0 && p.parent) {
        p = p.parent;
        l--;
    }
    return p;
};

Component.prototype.getAncestorAtDepth = function(l) {
    var levels = this.getDepth() - l;
    if (levels < 0) {
        return null;
    }
    return this.getAncestor(levels);
};

Component.prototype.isAncestorOf = function(c) {
    var p = c;
    while(p.parent) {
        if (this === p) {
            return true;
        }
        p = p.parent;
    }
    return false;
};

Component.prototype.getSharedAncestor = function(c) {
    var o1 = this;
    var o2 = c;
    var l1 = o1.getDepth();
    var l2 = o2.getDepth();
    if (l1 > l2) {
        o1 = o1.getAncestor(l1 - l2);
    } else if (l2 > l1) {
        o2 = o2.getAncestor(l2 - l1);
    }

    do {
        if (o1 === o2) {
            return o1;
        }

        o1 = o1.parent;
        o2 = o2.parent;
    } while(o1 && o2);

    return null;
};

Component.prototype.isActive = function() {
    return this._visible && (this._alpha > 0) && (this.parent ? this.parent.active : (this.stage.root === this));
};

/**
 * Updates the 'active' flag for this branch.
 * @private
 */
Component.prototype.updateActiveFlag = function() {
    // Calculate active flag.
    var newActive = this.isActive();
    if (this.active !== newActive) {
        if (newActive) {
            if (this.zIndex != 0) {
                // Component uses z-index.
                this.stage.zIndexUsage++;
            }

            // Detect texture changes.
            var dt = null;
            if (this.texture && this.texture.source.glTexture) {
                dt = this.texture;
                this.texture.source.addComponent(this);
                this.texture.addComponent(this);
            } else if (this.displayedTexture && this.displayedTexture.source.glTexture) {
                dt = this.displayedTexture;
            }

            // Force re-check of texture because dimensions might have changed (cutting).
            this.displayedTexture = null;
            this.displayedTexture = dt;

            this.active = newActive;

            if (this.texture) {
                // It is important to add the source listener before the texture listener because that may trigger a load.
                this.texture.source.addComponent(this);
                this.texture.addComponent(this);
            }

            if (this.displayedTexture && this.displayedTexture !== this.texture) {
                this.displayedTexture.source.addComponent(this);
                this.displayedTexture.addComponent(this);
            }
        } else {
            if (this.zIndex != 0) {
                // Component uses z-index.
                this.stage.zIndexUsage--;
            }

            if (this.texture) {
                this.texture.removeComponent(this);
                this.texture.source.removeComponent(this);
            }

            if (this.displayedTexture) {
                this.displayedTexture.removeComponent(this);
                this.displayedTexture.source.removeComponent(this);
            }

            this.active = newActive;
        }

        var m = this.children.length;
        if (m > 0) {
            for (var i = 0; i < m; i++) {
                this.children[i].updateActiveFlag();
            }
        }

        // Run this after all children because we'd like to see (de)activating a branch as an 'atomic' operation.
        if (newActive) {
            this.notifyActivate && this.notifyActivate();
        } else {
            this.notifyDeactivate && this.notifyDeactivate();
        }
    }
};

Component.prototype.getRenderWidth = function() {
    if (this.active) {
        return this._renderWidth;
    } else {
        return this._getRenderWidth();
    }
};

Component.prototype._getRenderWidth = function() {
    if (this._w) {
        return this._w;
    } else if (this.texture && this.texture.source.glTexture) {
        // Texture already loaded, but not yet updated (probably because it's not active).
        if (this.texture.precision != 1) {
            return (this.texture.w || this.texture.source.w);
        } else {
            return (this.texture.w || this.texture.source.w) / this.texture.precision;
        }
    } else if (this.displayedTexture) {
        if (this.displayedTexture.precision != 1) {
            return (this.displayedTexture.w || this.displayedTexture.source.w);
        } else {
            return (this.displayedTexture.w || this.displayedTexture.source.w) / this.displayedTexture.precision;
        }
    } else {
        return 0;
    }
};

Component.prototype.getRenderHeight = function() {
    if (this.active) {
        return this._renderHeight;
    } else {
        return this._getRenderHeight();
    }
};

Component.prototype._getRenderHeight = function() {
    if (this._h) {
        return this._h;
    } else if (this.texture && this.texture.source.glTexture) {
        // Texture already loaded, but not yet updated (probably because it's not active).
        if (this.texture.precision != 1) {
            return (this.texture.h || this.texture.source.h);
        } else {
            return (this.texture.h || this.texture.source.h) / this.texture.precision;
        }
    } else if (this.displayedTexture) {
        if (this.displayedTexture.precision != 1) {
            return (this.displayedTexture.h || this.displayedTexture.source.h);
        } else {
            return (this.displayedTexture.h || this.displayedTexture.source.h) / this.displayedTexture.precision;
        }
    } else {
        return 0;
    }
};

Component.prototype.setTransition = function(properties, settings) {
    if (Utils.isArray(properties)) {
        for (var i = 0; i < properties.length; i++) {
            this.setPropertyTransition(properties[i], settings);
        }
    } else {
        this.setPropertyTransition(properties, settings);
    }
};

Component.prototype.setPropertyTransition = function(property, settings) {
    if (Component.propAliases.has(property)) {
        this.setTransition(Component.propAliases.get(property), settings);
    } else {
        var propertyIndex = Component.getPropertyIndex(property);
        if (propertyIndex == -1) {
            throw new Error("Unknown transition property: " + property);
        }

        if (!settings) {
            if (this.transitions) {
                this.transitions[propertyIndex] = null;
            }
        } else {
            // Only reset on change.
            if (!this.transitions) {
                this.transitions = new Array(Component.nProperties);
                this.transitionProperties = [];
            }
            if (!this.transitions[propertyIndex]) {
                var mf = Component.getMergeFunction(property);
                var t = new Transition(this[property], mf);
                var self = this;
                t.onActivate = function() {
                    self.stage.addActiveTransition(self, propertyIndex);
                };
                t.property = property.toUpperCase();
                this.transitions[propertyIndex] = t;
                this.transitionProperties.push(propertyIndex);
            }
            this.transitions[propertyIndex].set(settings);
        }
    }
};

Component.prototype.getCornerPoints = function() {
    return this.uComponent.getCornerPoints();
};

Component.prototype.getTransition = function(property) {
    if (Component.propAliases.has(property)) {
        property = Component.propAliases.get(property)[0];
    }

    var propertyIndex = Component.getPropertyIndex(property);
    if (propertyIndex == -1) {
        throw new Error("Unknown transition property: " + property);
    }

    if (this.transitions && this.transitions[propertyIndex]) {
        return this.transitions[propertyIndex];
    } else {
        return null;
    }
};

/**
 * Fast-forwards the transition(s).
 * @param {string} property
 */
Component.prototype.fastForward = function(property) {
    var i, n;

    if (Component.propAliases.has(property)) {
        var aliasedProperties = Component.propAliases.get(property);
        n = aliasedProperties.length;
        for (i = 0; i < n; i++) {
            this.fastForward(aliasedProperties[i]);
        }
    } else {
        var propertyIndex = Component.getPropertyIndex(property);
        if (propertyIndex == -1) {
            throw new Error("Unknown transition property: " + property);
        }

        if (this.transitions && this.transitions[propertyIndex]) {
            var t = this.transitions[propertyIndex];
            if (t && t.isActive()) {
                t.reset(t.targetValue, t.targetValue, 1);
                Component.propertySettersFinal[propertyIndex](this, t.targetValue);

                // Immediately invoke onFinish event.
                t.invokeListeners();

                this.stage.removeActiveTransition(this, propertyIndex);
            }
        }
    }

};

Component.prototype.getLocationString = function() {
    var i;
    if (this.parent) {
        i = this.parent.children.indexOf(this);
        if (i >= 0) {
            var localTags = this.getLocalTags();
            return this.parent.getLocationString() + ":" + i + "[" + this.id + "]" + (localTags.length ? "(" + localTags.join(",") + ")" : "");
        }
    }
    return "";
};

Component.prototype.getLocalTags = function() {
    return Utils.iteratorToArray(this.tags.keys());
};

Component.prototype.setTags = function(tags) {
    if (!Utils.isArray(tags)) {
        tags = [tags];
    }

    var i, n = tags.length;
    var removes = [];
    var adds = [];
    for (i = 0; i < n; i++) {
        if (!this.tags.has(tags[i])) {
            adds.push(tags[i]);
        }
    }

    var currentTags = Utils.setToArray(this.tags);
    n = currentTags.length;
    for (i = 0; i < n; i++) {
        if (tags.indexOf(currentTags[i]) == -1) {
            removes.push(currentTags[i]);
        }
    }

    for (i = 0; i < removes.length; i++) {
        this.removeTag(removes[i]);
    }

    for (i = 0; i < adds.length; i++) {
        this.addTag(adds[i]);
    }

};

Component.prototype.addTag = function(tag) {
    if (this.tags.has(tag)) {
        return;
    }

    this.tags.add(tag);

    // Add to treeTags hierarchy.
    var p = this;
    do {
        if (!p.treeTags.has(tag)) {
            var s = new Set();
            s.add(this);
            p.treeTags.set(tag, s);
        } else {
            p.treeTags.get(tag).add(this);
        }

        if (p.treeTagsUpdatedFrame.has(tag)) {
            p.treeTagsUpdatedFrame.set(tag, this.stage.frameCounter);
        }
    } while (p = p.parent);
};

Component.prototype.removeTag = function(tag) {
    this.tags.delete(tag);

    // Remove from treeTags hierarchy.
    var p = this;
    do {
        var list = p.treeTags.get(tag);
        if (list) {
            list.delete(this);

            if (p.treeTagsUpdatedFrame.has(tag)) {
                p.treeTagsUpdatedFrame.set(tag, this.stage.frameCounter);
            }
        }
    } while (p = p.parent);
};

Component.prototype.hasTag = function(tag) {
    return this.tags.has(tag);
};

/**
 * Returns all components from the subtree that have this tag.
 * @note this component is not considered.
 * @param {string} tag
 * @returns {Component[]}
 */
Component.prototype.getByTag = function(tag) {
    if (this.treeTags.has(tag)) {
        // This looks slow, but is fast: https://jsperf.com/set-iterator-vs-foreach.
        return Utils.setToArray(this.treeTags.get(tag));
    } else {
        return [];
    }
};

Component.prototype.tag = function(tag) {
    if (this.treeTags.has(tag)) {
        var v = this.treeTags.get(tag).values().next();
        if (v.done) return null;
        return v.value;
    } else {
        return null;
    }
};

Component.prototype.setByTag = function(tag, settings) {
    var t = this.getByTag(tag);
    var n = t.length;
    for (var i = 0; i < n; i++) {
        t[i].set(settings);
    }
};

Component.prototype.textureSourceIsLoaded = function() {
    // Now we can start showing this texture.
    this.displayedTexture = this.texture;
};

Component.prototype.textureSourceIsAddedToTextureAtlas = function() {
    this._updateTextureCoords();
};

Component.prototype.textureSourceIsRemovedFromTextureAtlas = function() {
    this._updateTextureCoords();
};

Component.prototype.displayedTextureClippingChanged = function() {
    this._renderWidth = this._getRenderWidth();
    this._renderHeight = this._getRenderHeight();

    this._updateLocalDimensions();
    this._updateTextureCoords();
};

Component.prototype.set = function(obj) {
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
        var value = obj[keys[i]];
        this.setSetting(keys[i], value);
    }
};

Component.prototype.setSetting = function(name, value) {
    var index = Component.getPropertyIndex(name);
    if (index >= 0) {
        Component.propertySetters[index](this, value);
    } else {
        index = Component.getPropertyIndexFinal(name);
        if (index >= 0) {
            Component.propertySettersFinal[index](this, value);
        } else {
            switch(name) {
                case 'tag':
                case 'tags':
                    this.setTags(value);
                    break;
                case 'children':
                    var stage = this.stage;
                    if (!Utils.isArray(value)) {
                        throw new TypeError('Children must be array.');
                    }
                    var c = [];
                    for (var i = 0, n = value.length; i < n; i++) {
                        if (value[i] instanceof Component) {
                            c[i] = value[i];
                        } else {
                            c[i] = stage.c(value[i]);
                        }
                    }
                    this.setChildren(c);
                    break;
                case 'transitions':
                    if (!Utils.isObject(value)) {
                        throw new TypeError('Transitions must be object.');
                    }

                    for (var key in value) {
                        this.setTransition(key, value[key]);
                    }

                    break;
                default:
                    this[name] = value;
            }
        }
    }
};

Component.prototype.toString = function() {
    var obj = this.getSettingsObject();
    return Component.getPrettyJsonified(obj, "");
};

Component.getPrettyJsonified = function(obj, indent) {
    var children = obj.children;
    delete obj.children;

    // Convert singular json settings object.
    var colorKeys = ["color", "colorTopLeft", "colorTopRight", "colorBottomLeft", "colorBottomRight", "borderColor", "borderColorTop", "borderColorBottom", "borderColorLeft", "borderColorRight"]
    var str = JSON.stringify(obj, function(k, v) {
        if (colorKeys.indexOf(k) !== -1) {
            return "COLOR[" + v.toString(16) + "]";
        }
        return v;
    });
    str = str.replace(/"COLOR\[([a-f0-9]{1,8})\]"/g, "0x$1");

    if (children && children.length) {
        var isEmpty = (str === "{}");
        str = str.substr(0, str.length - 1) + (isEmpty ? "" : ",") + "\"children\":[\n";
        var n = children.length;
        for (var i = 0; i < n; i++) {
            str += Component.getPrettyJsonified(children[i], indent + "  ") + (i < n - 1 ? "," : "") + "\n";
        }
        str += indent + "]}";
    }

    return indent + str;
};

Component.prototype.getSettingsObject = function() {
    var obj = this.getNonDefaults();
    if (this.hasChildren) {
        obj.children = this.children.map(function(c) {
            return c.getSettingsObject();
        });
    }
    return obj;
};

Component.prototype.getNonDefaults = function() {
    var nonDefaults = {};

    if (this._tags && this.tags.size) {
        nonDefaults['tags'] = Utils.setToArray(this.tags);
    }

    if (this.x !== 0) nonDefaults['x'] = this.x;
    if (this.y !== 0) nonDefaults['y'] = this.y;
    if (this.w !== 0) nonDefaults['w'] = this.w;
    if (this.h !== 0) nonDefaults['h'] = this.h;

    if (this.alpha !== 1) nonDefaults['alpha'] = this.alpha;
    if (this.rotation !== 0) nonDefaults['rotation'] = this.rotation;
    if (this.visible !== true) nonDefaults['visible'] = this.visible;
    if (this.clipping !== false) nonDefaults['clipping'] = this.clipping;
    if (this.zIndex) nonDefaults['zIndex'] = this.zIndex;
    if (this.forceZIndexContext !== false) nonDefaults['forceZIndexContext'] = this.forceZIndexContext;

    if (this.textRenderer) {
        nonDefaults['text'] = this.textRenderer.settings.getNonDefaults();
    }

    if (this.src) nonDefaults['src'] = this.src;

    if (this.rect) nonDefaults['rect'] = true;


    if (this.scaleX !== 1 && this.scaleX === this.scaleY) {
        nonDefaults['scale'] = this.scaleX;
    } else {
        if (this.scaleX !== 1) nonDefaults['scaleX'] = this.scaleX;
        if (this.scaleY !== 1) nonDefaults['scaleY'] = this.scaleY;
    }

    if (this.pivotX !== 0.5) nonDefaults['pivotX'] = this.pivotX;
    if (this.pivotY !== 0.5) nonDefaults['pivotY'] = this.pivotY;

    if (this.mountX !== 0) nonDefaults['mountX'] = this.mountX;
    if (this.mountY !== 0) nonDefaults['mountY'] = this.mountY;

    if (this.borderWidthTop !== 0 && this.borderWidthTop === this.borderWidthBottom && this.borderWidthTop === this.borderWidthLeft && this.borderWidthTop === this.borderWidthRight) {
        nonDefaults['borderWidth'] = this.borderWidthTop;
    } else {
        if (this.borderWidthTop !== 0) nonDefaults['borderWidthTop'] = this.borderWidthTop;
        if (this.borderWidthBottom !== 0) nonDefaults['borderWidthBottom'] = this.borderWidthBottom;
        if (this.borderWidthLeft !== 0) nonDefaults['borderWidthLeft'] = this.borderWidthLeft;
        if (this.borderWidthRight !== 0) nonDefaults['borderWidthRight'] = this.borderWidthRight;
    }

    if (this.borderColorTop !== 0xffffffff && this.borderColorTop === this.borderColorBottom && this.borderColorTop === this.borderColorLeft && this.borderColorTop === this.borderColorRight) {
        nonDefaults['borderColor'] = this.borderColorTop;
    } else {
        if (this.borderColorTop !== 0xffffffff) nonDefaults['borderColorTop'] = this.borderColorTop;
        if (this.borderColorBottom !== 0xffffffff) nonDefaults['borderColorBottom'] = this.borderColorBottom;
        if (this.borderColorLeft !== 0xffffffff) nonDefaults['borderColorLeft'] = this.borderColorLeft;
        if (this.borderColorRight !== 0xffffffff) nonDefaults['borderColorRight'] = this.borderColorRight;
    }

    if (this.colorTopLeft !== 0xffffffff && this.colorTopLeft === this.colorTopRight && this.colorTopLeft === this.colorBottomLeft && this.colorTopLeft === this.colorBottomRight) {
        nonDefaults['color'] = this.colorTopLeft;
    } else {
        if (this.colorTopLeft !== 0xffffffff) nonDefaults['colorTopLeft'] = this.colorTopLeft;
        if (this.colorTopRight !== 0xffffffff) nonDefaults['colorTopRight'] = this.colorTopRight;
        if (this.colorBottomLeft !== 0xffffffff) nonDefaults['colorBottomLeft'] = this.colorBottomLeft;
        if (this.colorBottomRight !== 0xffffffff) nonDefaults['colorBottomRight'] = this.colorBottomRight;
    }

    return nonDefaults;
};


Component.prototype.hasEqualColors = function() {
    return (this._colorTopLeft === this._colorTopRight) && (this._colorTopLeft === this._colorBottomRight) && (this._colorTopLeft === this._colorBottomLeft);
};

/**
 * Holds the known property aliases.
 * @type {Map<string, string[]>}
 */
Component.propAliases = new Map();
Component.propAliases.set("scale", ["scaleX", "scaleY"]);
Component.propAliases.set("borderWidth", ["borderWidthTop", "borderWidthBottom", "borderWidthLeft", "borderWidthRight"]);
Component.propAliases.set("borderColor", ["borderColorTop", "borderColorBottom", "borderColorLeft", "borderColorRight"]);
Component.propAliases.set("color", ["colorTopLeft", "colorTopRight", "colorBottomLeft", "colorBottomRight"]);
Component.propAliases.set("colorTop", ["colorTopLeft", "colorTopRight"]);
Component.propAliases.set("colorBottom", ["colorBottomLeft", "colorBottomRight"]);
Component.propAliases.set("colorLeft", ["colorTopLeft", "colorBottomLeft"]);
Component.propAliases.set("colorRight", ["colorTopRight", "colorBottomRight"]);

Object.defineProperty(Component.prototype, 'renderWidth', {
    get: function () {
        return this.getRenderWidth();
    }
});

Object.defineProperty(Component.prototype, 'renderHeight', {
    get: function () {
        return this.getRenderHeight();
    }
});

Object.defineProperty(Component.prototype, 'x', {
    get: function () {
        if (this.transitions && this.transitions[0]) {
            return this.transitions[0].targetValue;
        } else {
            return this.X;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[0]) {
            this.setTransitionTargetValue(this.transitions[0], v, this.X);
        } else {
            this.X = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'X', {
    get: function () {
        return this._x;
    },
    set: function(v) {
        var pv = this._x;
        if (pv !== v) {
            this._x = v;
            this._updateLocalTranslateDelta(v - pv, 0);
        }
    }
});

Object.defineProperty(Component.prototype, 'y', {
    get: function () {
        if (this.transitions && this.transitions[1]) {
            return this.transitions[1].targetValue;
        } else {
            return this.Y;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[1]) {
            var t = this.transitions[1];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[1], v, this.Y);
            }
        } else {
            this.Y = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'Y', {
    get: function () {
        return this._y;
    },
    set: function(v) {
        var pv = this._y;
        if (pv !== v) {
            this._y = v;
            this._updateLocalTranslateDelta(0, v - pv);
        }
    }
});

Object.defineProperty(Component.prototype, 'w', {
    get: function () {
        if (this.transitions && this.transitions[2]) {
            return this.transitions[2].targetValue;
        } else {
            return this.W;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[2]) {
            var t = this.transitions[2];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[2], v, this.W);
            }
        } else {
            this.W = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'W', {
    get: function () {
        return this._w;
    },
    set: function(v) {
        var pv = this._w;
        if (pv !== v) {
            this._w = v;
            this._renderWidth = this._getRenderWidth();
            this._updateLocalDimensions();
        }
    }
});

Object.defineProperty(Component.prototype, 'h', {
    get: function () {
        if (this.transitions && this.transitions[3]) {
            return this.transitions[3].targetValue;
        } else {
            return this.H;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[3]) {
            var t = this.transitions[3];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[3], v, this.H);
            }
        } else {
            this.H = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'H', {
    get: function () {
        return this._h;
    },
    set: function(v) {
        var pv = this._h;
        if (pv !== v) {
            this._h = v;
            this._renderHeight = this._getRenderHeight();
            this._updateLocalDimensions();
        }
    }
});

Object.defineProperty(Component.prototype, 'scaleX', {
    get: function () {
        if (this.transitions && this.transitions[4]) {
            return this.transitions[4].targetValue;
        } else {
            return this.SCALEX;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[4]) {
            var t = this.transitions[4];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[4], v, this.SCALEX);
            }
        } else {
            this.SCALEX = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'SCALEX', {
    get: function () {
        return this._scaleX;
    },
    set: function(v) {
        var pv = this._scaleX;
        if (pv !== v) {
            this._scaleX = v;
            this._updateLocalTransform();
        }
    }
});

Object.defineProperty(Component.prototype, 'scaleY', {
    get: function () {
        if (this.transitions && this.transitions[5]) {
            return this.transitions[5].targetValue;
        } else {
            return this.SCALEY;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[5]) {
            var t = this.transitions[5];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[5], v, this.SCALEY);
            }
        } else {
            this.SCALEY = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'SCALEY', {
    get: function () {
        return this._scaleY;
    },
    set: function(v) {
        var pv = this._scaleY;
        if (pv !== v) {
            this._scaleY = v;
            this._updateLocalTransform();
        }
    }
});

Object.defineProperty(Component.prototype, 'pivotX', {
    get: function () {
        if (this.transitions && this.transitions[6]) {
            return this.transitions.get('pivotX').targetValue;
        } else {
            return this.PIVOTX;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[6]) {
            var t = this.transitions[6];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[6], v, this.PIVOTX);
            }
        } else {
            this.PIVOTX = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'PIVOTX', {
    get: function () {
        return this._pivotX;
    },
    set: function(v) {
        var pv = this._pivotX;
        if (pv !== v) {
            this._pivotX = v;
            this._updateLocalTranslate();
        }
    }
});

Object.defineProperty(Component.prototype, 'pivotY', {
    get: function () {
        if (this.transitions && this.transitions[7]) {
            return this.transitions[7].targetValue;
        } else {
            return this.PIVOTY;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[7]) {
            var t = this.transitions[7];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[7], v, this.PIVOTY);
            }
        } else {
            this.PIVOTY = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'PIVOTY', {
    get: function () {
        return this._pivotY;
    },
    set: function(v) {
        var pv = this._pivotY;
        if (pv !== v) {
            this._pivotY = v;
            this._updateLocalTranslate();
        }
    }
});

Object.defineProperty(Component.prototype, 'mountX', {
    get: function () {
        if (this.transitions && this.transitions[8]) {
            return this.transitions[8].targetValue;
        } else {
            return this.MOUNTX;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[8]) {
            var t = this.transitions[8];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[8], v, this.MOUNTX);
            }
        } else {
            this.MOUNTX = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'MOUNTX', {
    get: function () {
        return this._mountX;
    },
    set: function(v) {
        var pv = this._mountX;
        if (pv !== v) {
            this._mountX = v;
            this._updateLocalTranslate();
        }
    }
});

Object.defineProperty(Component.prototype, 'mountY', {
    get: function () {
        if (this.transitions && this.transitions[9]) {
            return this.transitions[9].targetValue;
        } else {
            return this.MOUNTY;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[9]) {
            var t = this.transitions[9];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[9], v, this.MOUNTY);
            }
        } else {
            this.MOUNTY = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'MOUNTY', {
    get: function () {
        return this._mountY;
    },
    set: function(v) {
        var pv = this._mountY;
        if (pv !== v) {
            this._mountY = v;
            this._updateLocalTranslate();
        }
    }
});

Object.defineProperty(Component.prototype, 'alpha', {
    get: function () {
        if (this.transitions && this.transitions[10]) {
            return this.transitions[10].targetValue;
        } else {
            return this.ALPHA;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[10]) {
            var t = this.transitions[10];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[10], v, this.ALPHA);
            }
        } else {
            this.ALPHA = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'ALPHA', {
    get: function () {
        return this._alpha;
    },
    set: function(v) {
        if (v > 1) {
            v = 1;
        } else if (v < 0) {
            v = 0;
        }
        var pv = this._alpha;
        if (pv !== v) {
            this._alpha = v;
            this._updateLocalAlpha();
            if ((pv === 0) !== (v === 0)) {
                this.updateActiveFlag();
            }
        }
    }
});

Object.defineProperty(Component.prototype, 'rotation', {
    get: function () {
        if (this.transitions && this.transitions[11]) {
            return this.transitions[11].targetValue;
        } else {
            return this.ROTATION;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[11]) {
            var t = this.transitions[11];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[11], v, this.ROTATION);
            }
        } else {
            this.ROTATION = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'ROTATION', {
    get: function () {
        return this._rotation;
    },
    set: function(v) {
        var pv = this._rotation;
        if (pv !== v) {
            this._rotation = v;
            this._updateLocalTransform();
        }
    }
});

Object.defineProperty(Component.prototype, 'borderWidthTop', {
    get: function () {
        if (this.transitions && this.transitions[12]) {
            return this.transitions[12].targetValue;
        } else {
            return this.BORDERWIDTHTOP;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[12]) {
            var t = this.transitions[12];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[12], v, this.BORDERWIDTHTOP);
            }
        } else {
            this.BORDERWIDTHTOP = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'BORDERWIDTHTOP', {
    get: function () {
        return this._borderWidthTop;
    },
    set: function(v) {
        var pv = this._borderWidthTop;
        if (pv !== v) {
            this._borderWidthTop = v;
            if ((pv === 0) !== (v === 0)) {
                this.hasBorders = this._borderWidthTop || this._borderWidthBottom || this._borderWidthLeft || this._borderWidthRight;
            }

            this.uComponent.setBorderTop(this._borderWidthTop, this._borderColorTop);
        }
    }
});

Object.defineProperty(Component.prototype, 'borderWidthBottom', {
    get: function () {
        if (this.transitions && this.transitions[13]) {
            return this.transitions[13].targetValue;
        } else {
            return this.BORDERWIDTHBOTTOM;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[13]) {
            var t = this.transitions[13];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[13], v, this.BORDERWIDTHBOTTOM);
            }
        } else {
            this.BORDERWIDTHBOTTOM = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'BORDERWIDTHBOTTOM', {
    get: function () {
        return this._borderWidthBottom;
    },
    set: function(v) {
        var pv = this._borderWidthBottom;
        if (pv !== v) {
            this._borderWidthBottom = v;
            if ((pv === 0) !== (v === 0)) {
                this.hasBorders = this._borderWidthBottom || this._borderWidthBottom || this._borderWidthLeft || this._borderWidthRight;
            }

            this.uComponent.setBorderBottom(this._borderWidthBottom, this._borderColorBottom);
        }
    }
});

Object.defineProperty(Component.prototype, 'borderWidthLeft', {
    get: function () {
        if (this.transitions && this.transitions[14]) {
            return this.transitions[14].targetValue;
        } else {
            return this.BORDERWIDTHLEFT;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[14]) {
            var t = this.transitions[14];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[14], v, this.BORDERWIDTHLEFT);
            }
        } else {
            this.BORDERWIDTHLEFT = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'BORDERWIDTHLEFT', {
    get: function () {
        return this._borderWidthLeft;
    },
    set: function(v) {
        var pv = this._borderWidthLeft;
        if (pv !== v) {
            this._borderWidthLeft = v;
            if ((pv === 0) !== (v === 0)) {
                this.hasBorders = this._borderWidthLeft || this._borderWidthBottom || this._borderWidthLeft || this._borderWidthRight;
            }
            this.uComponent.setBorderLeft(this._borderWidthLeft, this._borderColorLeft);
        }
    }
});

Object.defineProperty(Component.prototype, 'borderWidthRight', {
    get: function () {
        if (this.transitions && this.transitions[15]) {
            return this.transitions[15].targetValue;
        } else {
            return this.BORDERWIDTHRIGHT;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[15]) {
            var t = this.transitions[15];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[15], v, this.BORDERWIDTHRIGHT);
            }
        } else {
            this.BORDERWIDTHRIGHT = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'BORDERWIDTHRIGHT', {
    get: function () {
        return this._borderWidthRight;
    },
    set: function(v) {
        var pv = this._borderWidthRight;
        if (pv !== v) {
            this._borderWidthRight = v;
            if ((pv === 0) !== (v === 0)) {
                this.hasBorders = this._borderWidthRight || this._borderWidthBottom || this._borderWidthRight || this._borderWidthRight;
            }
            this.uComponent.setBorderRight(this._borderWidthRight, this._borderColorRight);
        }
    }
});

Object.defineProperty(Component.prototype, 'borderColorTop', {
    get: function () {
        if (this.transitions && this.transitions[16]) {
            return this.transitions[16].targetValue;
        } else {
            return this.BORDERCOLORTOP;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[16]) {
            var t = this.transitions[16];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[16], v, this.BORDERCOLORTOP);
            }
        } else {
            this.BORDERCOLORTOP = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'BORDERCOLORTOP', {
    get: function () {
        return this._borderColorTop;
    },
    set: function(v) {
        var pv = this._borderColorTop;
        if (pv !== v) {
            this._borderColorTop = v;
            this.uComponent.setBorderTop(this._borderWidthTop, this._borderColorTop);
        }
    }
});

Object.defineProperty(Component.prototype, 'borderColorBottom', {
    get: function () {
        if (this.transitions && this.transitions[17]) {
            return this.transitions[17].targetValue;
        } else {
            return this.BORDERCOLORBOTTOM;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[17]) {
            var t = this.transitions[17];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[17], v, this.BORDERCOLORBOTTOM);
            }
        } else {
            this.BORDERCOLORBOTTOM = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'BORDERCOLORBOTTOM', {
    get: function () {
        return this._borderColorBottom;
    },
    set: function(v) {
        var pv = this._borderColorBottom;
        if (pv !== v) {
            this._borderColorBottom = v;
            this.uComponent.setBorderBottom(this._borderWidthBottom, this._borderColorBottom);
        }
    }
});

Object.defineProperty(Component.prototype, 'borderColorLeft', {
    get: function () {
        if (this.transitions && this.transitions[18]) {
            return this.transitions[18].targetValue;
        } else {
            return this.BORDERCOLORLEFT;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[18]) {
            var t = this.transitions[18];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[18], v, this.BORDERCOLORLEFT);
            }
        } else {
            this.BORDERCOLORLEFT = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'BORDERCOLORLEFT', {
    get: function () {
        return this._borderColorLeft;
    },
    set: function(v) {
        var pv = this._borderColorLeft;
        if (pv !== v) {
            this._borderColorLeft = v;
            this.uComponent.setBorderLeft(this._borderWidthLeft, this._borderColorLeft);
        }
    }
});

Object.defineProperty(Component.prototype, 'borderColorRight', {
    get: function () {
        if (this.transitions && this.transitions[19]) {
            return this.transitions[19].targetValue;
        } else {
            return this.BORDERCOLORRIGHT;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[19]) {
            var t = this.transitions[19];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[19], v, this.BORDERCOLORRIGHT);
            }
        } else {
            this.BORDERCOLORRIGHT = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'BORDERCOLORRIGHT', {
    get: function () {
        return this._borderColorRight;
    },
    set: function(v) {
        var pv = this._borderColorRight;
        if (pv !== v) {
            this._borderColorRight = v;
            this.uComponent.setBorderRight(this._borderWidthRight, this._borderColorRight);
        }
    }
});

Object.defineProperty(Component.prototype, 'colorTopLeft', {
    get: function () {
        if (this.transitions && this.transitions[20]) {
            return this.transitions[20].targetValue;
        } else {
            return this.COLORTOPLEFT;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[20]) {
            var t = this.transitions[20];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[20], v, this.COLORTOPLEFT);
            }
        } else {
            this.COLORTOPLEFT = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'COLORTOPLEFT', {
    get: function () {
        return this._colorTopLeft;
    },
    set: function(v) {
        var pv = this._colorTopLeft;
        if (pv !== v) {
            this._colorTopLeft = v;
            this.uComponent.setColorUl(v);
        }
    }
});

Object.defineProperty(Component.prototype, 'colorTopRight', {
    get: function () {
        if (this.transitions && this.transitions[21]) {
            return this.transitions[21].targetValue;
        } else {
            return this.COLORTOPRIGHT;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[21]) {
            var t = this.transitions[21];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[21], v, this.COLORTOPRIGHT);
            }
        } else {
            this.COLORTOPRIGHT = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'COLORTOPRIGHT', {
    get: function () {
        return this._colorTopRight;
    },
    set: function(v) {
        var pv = this._colorTopRight;
        if (pv !== v) {
            this._colorTopRight = v;
            this.uComponent.setColorUr(v);
        }
    }
});

Object.defineProperty(Component.prototype, 'colorBottomLeft', {
    get: function () {
        if (this.transitions && this.transitions[22]) {
            return this.transitions[22].targetValue;
        } else {
            return this.COLORBOTTOMLEFT;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[22]) {
            var t = this.transitions[22];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[22], v, this.COLORBOTTOMLEFT);
            }
        } else {
            this.COLORBOTTOMLEFT = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'COLORBOTTOMLEFT', {
    get: function () {
        return this._colorBottomLeft;
    },
    set: function(v) {
        var pv = this._colorBottomLeft;
        if (pv !== v) {
            this._colorBottomLeft = v;
            this.uComponent.setColorBl(v);
        }
    }
});

Object.defineProperty(Component.prototype, 'colorBottomRight', {
    get: function () {
        if (this.transitions && this.transitions[23]) {
            return this.transitions[23].targetValue;
        } else {
            return this.COLORBOTTOMRIGHT;
        }
    },
    set: function(v) {
        if (this.transitions && this.transitions[23]) {
            var t = this.transitions[23];
            if (t.targetValue !== v) {
                this.setTransitionTargetValue(this.transitions[23], v, this.COLORBOTTOMRIGHT);
            }
        } else {
            this.COLORBOTTOMRIGHT = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'COLORBOTTOMRIGHT', {
    get: function () {
        return this._colorBottomRight;
    },
    set: function(v) {
        var pv = this._colorBottomRight;
        if (pv !== v) {
            this._colorBottomRight = v;
            this.uComponent.setColorBr(v);
        }
    }
});

Object.defineProperty(Component.prototype, 'visible', {
    get: function () {
        return this._visible;
    },
    set: function(v) {
        var pv = this._visible;
        if (pv !== v) {
            this._visible = v;
            this._updateLocalAlpha();
            this.updateActiveFlag();
        }
    }
});

Object.defineProperty(Component.prototype, 'clipping', {
    get: function () {
        return this._clipping;
    },
    set: function(v) {
        var pv = this._clipping;
        if (pv !== v) {
            this._clipping = v;
            this.uComponent.setClipping(v);
        }
    }
});

Object.defineProperty(Component.prototype, 'zIndex', {
    get: function () {
        return this._zIndex;
    },
    set: function(v) {
        var pv = this._zIndex;
        if (pv !== v) {
            this._zIndex = v;
            if (this.active) {
                if (pv !== 0 && v === 0) {
                    this.stage.zIndexUsage--;
                } else if (pv === 0 && v !== 0) {
                    this.stage.zIndexUsage++;
                }
            }
            this.uComponent.setZIndex(this.zIndex);
        }
    }
});

Object.defineProperty(Component.prototype, 'forceZIndexContext', {
    get: function () {
        return this._forceZIndexContext;
    },
    set: function(v) {
        var pv = this._forceZIndexContext;
        if (pv !== v) {
            this._forceZIndexContext = v;
            this.uComponent.setForceZIndexContext(this.forceZIndexContext);
        }
    }
});

Object.defineProperty(Component.prototype, 'scale', {
    get: function() { return this.scaleX; },
    set: function(v) {
        this.scaleX = v;
        this.scaleY = v;
    }
});

Object.defineProperty(Component.prototype, 'borderWidth', {
    get: function() { return this.borderWidthTop; },
    set: function(v) {
        this.borderWidthTop = v;
        this.borderWidthBottom = v;
        this.borderWidthLeft = v;
        this.borderWidthRight = v;
    }
});

Object.defineProperty(Component.prototype, 'borderColor', {
    get: function() { return this.borderColorTop; },
    set: function(v) {
        this.borderColorTop = v;
        this.borderColorBottom = v;
        this.borderColorLeft = v;
        this.borderColorRight = v;
    }
});

Object.defineProperty(Component.prototype, 'texture', {
    get: function() { return this._texture; },
    set: function(v) {
        var prevValue = this._texture;
        if (v !== prevValue) {
            if (v !== null && (!v instanceof Texture)) {
                throw new Error('incorrect value for texture');
            }

            this._texture = v;

            if (this.active && prevValue && this.displayedTexture !== prevValue) {
                prevValue.removeComponent(this);

                if (!v || prevValue.source !== v.source) {
                    if (!this.displayedTexture || (this.displayedTexture.source !== prevValue.source)) {
                        prevValue.source.removeComponent(this);
                    }
                }
            }

            if (v) {
                if (this.active) {
                    // When the texture is changed, maintain the texture's sprite registry.
                    // While the displayed texture is different from the texture (not yet loaded), two textures are referenced.
                    v.addComponent(this);
                    v.source.addComponent(this);
                }

                if (v.source.glTexture) {
                    this.displayedTexture = v;
                }
            } else {
                // Make sure that current texture is cleared when the texture is explicitly set to null.
                this.displayedTexture = null;
            }
        }
    }
});

Object.defineProperty(Component.prototype, 'displayedTexture', {
    get: function() { return this._displayedTexture; },
    set: function(v) {
        var prevValue = this._displayedTexture;
        if (v !== prevValue) {
            if (this.active && prevValue) {
                // We can assume that this._texture === this._displayedTexture.

                if (prevValue !== this.texture) {
                    // The old displayed texture is deprecated.
                    prevValue.removeComponent(this);
                }

                if (!v || (prevValue.source !== v.source)) {
                    prevValue.source.removeComponent(this);
                }
            }

            var beforeW = this._renderWidth;
            var beforeH = this._renderHeight;
            this._displayedTexture = v;
            this._renderWidth = this._getRenderWidth();
            this._renderHeight = this._getRenderHeight();
            if (!prevValue || beforeW != this._renderWidth || beforeH != this._renderHeight) {
                // Due to width/height change: update the translation vector and borders.
                this._updateLocalDimensions();
            }
            if (v) {
                // We don't need to reference the displayed texture because it was already referenced (this.texture === this.displayedTexture).
                this._updateTextureCoords();
                this.stage.uComponentContext.setDisplayedTextureSource(this.uComponent, v.source);
            } else {
                this.stage.uComponentContext.setDisplayedTextureSource(this.uComponent, null);
            }
        }
    }
});

Object.defineProperty(Component.prototype, 'color', {
    get: function() { return this.colorTopLeft; },
    set: function(v) {
        this.colorTopLeft = v;
        this.colorTopRight = v;
        this.colorBottomLeft = v;
        this.colorBottomRight = v;
    }
});

Object.defineProperty(Component.prototype, 'colorTop', {
    get: function() { return this.colorTopLeft; },
    set: function(v) {
        this.colorTopLeft = v;
        this.colorTopRight = v;
    }
});

Object.defineProperty(Component.prototype, 'colorBottom', {
    get: function() { return this.colorBottomLeft; },
    set: function(v) {
        this.colorBottomLeft = v;
        this.colorBottomRight = v;
    }
});

Object.defineProperty(Component.prototype, 'colorLeft', {
    get: function() { return this.colorTopLeft; },
    set: function(v) {
        this.colorTopLeft = v;
        this.colorBottomLeft = v;
    }
});

Object.defineProperty(Component.prototype, 'colorRight', {
    get: function() { return this.colorTopRight; },
    set: function(v) {
        this.colorTopRight = v;
        this.colorBottomRight = v;
    }
});

Object.defineProperty(Component.prototype, 'src', {
    get: function() { return this._src; },
    set: function(v) {
        var prevValue = this._src;

        if (!prevValue || prevValue.src !== v || !this.texture || !this.texture.source.renderInfo || this.texture.source.renderInfo.src !== v) {
            if (!v) {
                if (prevValue) {
                    this.texture = null;
                }
                this._src = null;
                return;
            }

            if (Utils.isString(v)) {
                v = {src:v};
            }

            this.texture = this.stage.textureManager.getTexture(v.src, v);

            this._src = v;
        }
    }
});

Object.defineProperty(Component.prototype, 'text', {
    get: function() {
        if (!this.textRenderer) {
            this.textRenderer = new ComponentText(this);
        }
        return this.textRenderer;
    },
    set: function(settings) {
        if (Utils.isString(settings)) {
            this.textRenderer.text = settings;
        } else {
            this.text.set(settings);
        }
    }
});

Object.defineProperty(Component.prototype, 'rect', {
    get: function() {
        return (this.texture === this.stage.getRectangleTexture());
    },
    set: function(v) {
        if (v) {
            this.texture = this.stage.getRectangleTexture();
        } else {
            this.texture = null;
        }
    }
});

Object.defineProperty(Component.prototype, 'tags', {
    get: function() {
        if (!this._tags) {
            this._tags = new Set();
        }
        return this._tags;
    }
});

Object.defineProperty(Component.prototype, 'treeTags', {
    get: function() {
        if (!this._treeTags) {
            this._treeTags = new Map();
        }
        return this._treeTags;
    }
});

Object.defineProperty(Component.prototype, 'treeTagsUpdatedFrame', {
    get: function() {
        if (!this._treeTagsUpdatedFrame) {
            this._treeTagsUpdatedFrame = new Map();
        }
        return this._treeTagsUpdatedFrame;
    }
});

Component.prototype.setTransitionTargetValue = function(transition, targetValue, currentValue) {
    transition.updateTargetValue(targetValue, currentValue);
};

Component.prototype._updateLocalTransform = function() {
    if (this._rotation !== 0 && this._rotation % (2 * Math.PI)) {
        // check to see if the rotation is the same as the previous render. This means we only need to use sin and cos when rotation actually changes
        if (this._rotation !== this.rotationCache) {
            this.rotationCache = this._rotation;
            this._sr = Math.sin(this._rotation);
            this._cr = Math.cos(this._rotation);
        }

        this.uComponent.setLocalTransform(
            this._cr * this._scaleX,
            -this._sr * this._scaleY,
            this._sr * this._scaleX,
            this._cr * this._scaleY
        );
    } else {
        this.uComponent.setLocalTransform(
            this._scaleX,
            0,
            0,
            this._scaleY
        );
    }
    this._updateLocalTranslate();
};

Component.prototype._updateLocalTranslate = function() {
    var pivotXMul = this._pivotX * this._renderWidth;
    var pivotYMul = this._pivotY * this._renderHeight;
    var px = this._x - (pivotXMul * this.uComponent.getLocalTa() + pivotYMul * this.uComponent.getLocalTb()) + pivotXMul;
    var py = this._y - (pivotXMul * this.uComponent.getLocalTc() + pivotYMul * this.uComponent.getLocalTd()) + pivotYMul;
    px -= this._mountX * this._renderWidth;
    py -= this._mountY * this._renderHeight;
    this.uComponent.setLocalTranslate(
        px,
        py
    );
};

Component.prototype._updateLocalTranslateDelta = function(dx, dy) {
    this.uComponent.addLocalTranslate(dx, dy);
};

Component.prototype._updateLocalAlpha = function() {
    this.uComponent.setLocalAlpha(this._visible ? this._alpha : 0);
};

Component.prototype._updateLocalDimensions = function() {
    this.uComponent.setDimensions(this._renderWidth, this._renderHeight);
    this._updateLocalTranslate();
};

Component.prototype._updateTextureCoords = function() {
    if (this.displayedTexture && this.displayedTexture.source) {
        var displayedTexture = this.displayedTexture;
        var displayedTextureSource = this.displayedTexture.source;

        var tx1 = 0, ty1 = 0, tx2 = 1.0, ty2 = 1.0;
        if (displayedTexture.clipping) {
            // Apply texture clipping.
            var iw, ih, rw, rh;
            iw = 1 / displayedTextureSource.w;
            ih = 1 / displayedTextureSource.h;

            if (displayedTexture.w) {
                rw = displayedTexture.w * iw;
            } else {
                rw = (displayedTextureSource.w - displayedTexture.x) * iw;
            }

            if (displayedTexture.h) {
                rh = displayedTexture.h * ih;
            } else {
                rh = (displayedTextureSource.h - displayedTexture.y) * ih;
            }

            iw *= displayedTexture.x;
            ih *= displayedTexture.y;

            tx1 = Math.min(1.0, Math.max(0, tx1 * rw + iw));
            ty1 = Math.min(1.0, Math.max(ty1 * rh + ih));
            tx2 = Math.min(1.0, Math.max(tx2 * rw + iw));
            ty2 = Math.min(1.0, Math.max(ty2 * rh + ih));
        }

        if (displayedTextureSource.inTextureAtlas) {
            // Calculate texture atlas texture coordinates.
            var textureAtlasI = 0.000488281;    // 1/2048.

            var tax = (displayedTextureSource.textureAtlasX * textureAtlasI);
            var tay = (displayedTextureSource.textureAtlasY * textureAtlasI);
            var dax = (displayedTextureSource.w * textureAtlasI);
            var day = (displayedTextureSource.h * textureAtlasI);

            tx1 = tx1 * dax + tax;
            ty1 = ty1 * day + tay;

            tx2 = tx2 * dax + tax;
            ty2 = ty2 * day + tay;
        }

        this.uComponent.setTextureCoords(tx1, ty1, tx2, ty2);
        this.uComponent.setInTextureAtlas(displayedTextureSource.inTextureAtlas);
    }
};

Component.rectangleSource = {src:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wsYCDk6C1pPiwAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAAMSURBVAjXY/j//z8ABf4C/tzMWecAAAAASUVORK5CYII=", id:"__whitepix"};
Component.getRectangleTexture = function(stage) {
    return stage.getTexture(Component.rectangleSource.src, Component.rectangleSource);
};

Component.getMergeFunction = function(property) {
    switch(property) {
        case "visible":
        case "clipping":
        case "zIndex":
        case "forceZIndexContext":
            // Unmergable property.
            return null;
        case "borderColorTop":
        case "borderColorBottom":
        case "borderColorLeft":
        case "borderColorRight":
        case "colorTopLeft":
        case "colorTopRight":
        case "colorBottomLeft":
        case "colorBottomRight":
            return StageUtils.mergeColors;
            break;
        default:
            // Use numeric method.
            return StageUtils.mergeNumbers;
    }
};

Component.getPropertyIndex = function(name) {
    return Component.propertyIndices[name];
};

Component.getPropertyIndexFinal = function(name) {
    return Component.propertyIndicesFinal[name];
};

Component.nProperties = 28;

Component.propertyIndices = {
    'x': 0,
    'y': 1,
    'w': 2,
    'h': 3,
    'scaleX': 4,
    'scaleY': 5,
    'pivotX': 6,
    'pivotY': 7,
    'mountX': 8,
    'mountY': 9,
    'alpha': 10,
    'rotation': 11,
    'borderWidthTop': 12,
    'borderWidthBottom': 13,
    'borderWidthLeft': 14,
    'borderWidthRight': 15,
    'borderColorTop': 16,
    'borderColorBottom': 17,
    'borderColorLeft': 18,
    'borderColorRight': 19,
    'colorTopLeft': 20,
    'colorTopRight': 21,
    'colorBottomLeft': 22,
    'colorBottomRight': 23,
    'visible': 24,
    'zIndex': 25,
    'forceZIndexContext': 26,
    'clipping': 27
};

Component.propertyIndicesFinal = {
    'X': 0,
    'Y': 1,
    'W': 2,
    'H': 3,
    'SCALEX': 4,
    'SCALEY': 5,
    'PIVOTX': 6,
    'PIVOTY': 7,
    'MOUNTX': 8,
    'MOUNTY': 9,
    'ALPHA': 10,
    'ROTATION': 11,
    'BORDERWIDTHTOP': 12,
    'BORDERWIDTHBOTTOM': 13,
    'BORDERWIDTHLEFT': 14,
    'BORDERWIDTHRIGHT': 15,
    'BORDERCOLORTOP': 16,
    'BORDERCOLORBOTTOM': 17,
    'BORDERCOLORLEFT': 18,
    'BORDERCOLORRIGHT': 19,
    'COLORTOPLEFT': 20,
    'COLORTOPRIGHT': 21,
    'COLORBOTTOMLEFT': 22,
    'COLORBOTTOMRIGHT': 23,
    'VISIBLE': 24,
    'ZINDEX': 25,
    'FORCEZINDEXCONTEXT': 26,
    'CLIPPING': 27
};

Component.propertySetters = [
    function(component, value) {component.x = value;},
    function(component, value) {component.y = value;},
    function(component, value) {component.w = value;},
    function(component, value) {component.h = value;},
    function(component, value) {component.scaleX = value;},
    function(component, value) {component.scaleY = value;},
    function(component, value) {component.pivotX = value;},
    function(component, value) {component.pivotY = value;},
    function(component, value) {component.mountX = value;},
    function(component, value) {component.mountY = value;},
    function(component, value) {component.alpha = value;},
    function(component, value) {component.rotation = value;},
    function(component, value) {component.borderWidthTop = value;},
    function(component, value) {component.borderWidthBottom = value;},
    function(component, value) {component.borderWidthLeft = value;},
    function(component, value) {component.borderWidthRight = value;},
    function(component, value) {component.borderColorTop = value;},
    function(component, value) {component.borderColorBottom = value;},
    function(component, value) {component.borderColorLeft = value;},
    function(component, value) {component.borderColorRight = value;},
    function(component, value) {component.colorTopLeft = value;},
    function(component, value) {component.colorTopRight = value;},
    function(component, value) {component.colorBottomLeft = value;},
    function(component, value) {component.colorBottomRight = value;},
    function(component, value) {component.visible = value;},
    function(component, value) {component.zIndex = value;},
    function(component, value) {component.forceZIndexContext = value;},
    function(component, value) {component.clipping = value;}
];

Component.propertySettersFinal = [
    function(component, value) {component.X = value;},
    function(component, value) {component.Y = value;},
    function(component, value) {component.W = value;},
    function(component, value) {component.H = value;},
    function(component, value) {component.SCALEX = value;},
    function(component, value) {component.SCALEY = value;},
    function(component, value) {component.PIVOTX = value;},
    function(component, value) {component.PIVOTY = value;},
    function(component, value) {component.MOUNTX = value;},
    function(component, value) {component.MOUNTY = value;},
    function(component, value) {component.ALPHA = value;},
    function(component, value) {component.ROTATION = value;},
    function(component, value) {component.BORDERWIDTHTOP = value;},
    function(component, value) {component.BORDERWIDTHBOTTOM = value;},
    function(component, value) {component.BORDERWIDTHLEFT = value;},
    function(component, value) {component.BORDERWIDTHRIGHT = value;},
    function(component, value) {component.BORDERCOLORTOP = value;},
    function(component, value) {component.BORDERCOLORBOTTOM = value;},
    function(component, value) {component.BORDERCOLORLEFT = value;},
    function(component, value) {component.BORDERCOLORRIGHT = value;},
    function(component, value) {component.COLORTOPLEFT = value;},
    function(component, value) {component.COLORTOPRIGHT = value;},
    function(component, value) {component.COLORBOTTOMLEFT = value;},
    function(component, value) {component.COLORBOTTOMRIGHT = value;},
    function(component, value) {component.visible = value;},
    function(component, value) {component.zIndex = value;},
    function(component, value) {component.forceZIndexContext = value;},
    function(component, value) {component.clipping = value;}
];
