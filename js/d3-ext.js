d3.selection.prototype.moveToFront = function () {
	 return this.each(function () {
			this.parentNode.appendChild(this);
	 });
};
d3.selection.prototype.moveToBack = function () {
	 return this.each(function () {
			var firstChild = this.parentNode.firstChild;
			if (firstChild) {
				   this.parentNode.insertBefore(this, firstChild);
			}
	 });
};
d3.selection.prototype.mAttr = function (attr) {
	 var d3This = this;
	 if (typeof attr === "function") {
			d3This.each(function (d, i) {
				   d3.select(this).mAttr(attr.call(this, d, i));
			});
	 } else {
			_.each(attr, function (a, k, attr) {
				   if (k === "text") {
						 d3This.text(a);
				   } else {
						 d3This.attr(k, a);
				   }
			});
	 }
	 return d3This;
};
d3.selection.prototype.height = function (height) {
	 return this.attr("height", height);
};
d3.selection.prototype.width = function (height) {
	 return this.attr("width", height);
};
d3.selection.prototype.svg = function (width, height, cls, attr) {
	 attr = attr || {};
	 cls && (attr.class = cls);
	 attr.height = height || 300;
	 attr.width = width || 400;
	 return this.append("svg:svg").mAttr(attr);
};
d3.selection.prototype.rect = function (attr, cls) {
	 attr = attr || {};
	 cls && (attr.class = cls);
	 return this.append("rect").mAttr(attr);
};
d3.selection.prototype.g = function (attr, cls) {
	 attr = attr || {};
	 cls && (attr.class = cls);
	 return this.append("g").mAttr(attr);
};
d3.selection.prototype.transform = function (attr) {
	 return this.attr("transform", attr);
};
d3.selection.prototype.appendText = function (attr, cls, text) {
	 attr = attr || {};
	 cls && (attr.class = cls);
	 text && (attr.text = text);
	 return this.append("text").mAttr(attr);
};
d3.selection.prototype.circle = function (attr, cls) {
	 attr = attr || {};
	 cls && (attr.class = cls);
	 return this.append("circle").mAttr(attr);
};
d3.selection.prototype.ellipse = function (attr, cls) {
	 attr = attr || {};
	 cls && (attr.class = cls);
	 return this.append("ellipse").mAttr(attr);
};
d3.selection.prototype.line = function (attr, cls) {
	attr = attr || {};
	cls && (attr.class = cls);
	return this.append("line").mAttr(attr);
};
d3.selection.prototype.addLine = function (startPoint, endPoint, attr, cls) {
	attr = attr || {};
	attr.x1 = startPoint[0];
	attr.y1 = startPoint[1];
	attr.x2 = endPoint[0];
	attr.y2 = endPoint[1];
	cls && (attr.class = cls);
	return this.append("line").mAttr(attr);
};
d3.selection.prototype.square = function (attr, cls) {
	 attr = attr || {};
	 cls && (attr.class = cls);
	 attr.height ? (attr.width = attr.height) : (attr.height = attr.width);
	 return this.append("rect").mAttr(attr);
};
d3.selection.prototype.addClass = function (cls) {
	 var classes = this.attr("class");
	 if (classes) {
			classes = classes.indexOf(" ") > -1 ? classes.split(" ") : [classes];
			if (classes.indexOf(cls) == -1) {
				   classes.push(cls);
			}
	 } else {
			classes = [cls];
	 }
	 this.attr("class", classes.join(" "));
	 return this;
};
d3.selection.prototype.removeClass = function (cls) {
	 var classes = this.attr("class");
	 if (classes && classes.indexOf(cls) > -1) {
			classes = classes.indexOf(" ") > -1 ? classes.split(" ") : [classes];
			var index = classes.indexOf(cls);
			if (index > -1) {
				   classes.splice(index, 1);
				   this.attr("class", classes.join(" "));
			}
	 }
	 return this;
};
d3.selection.prototype.mStyle = function (attr) {
	 var d3This = this;
	 if (typeof attr === "function") {
			d3This.each(function (d, i) {
				   d3.select(this).mStyle(attr.call(this, d, i));
			});
	 } else {
			_.each(attr, function (a, k, attr) {
				   if (k === "text") {
						 d3This.text(a);
				   } else {
						 d3This.style(k, a);
				   }
			});
	 }
	 return d3This;
};

function scale(x, y) {
	 var t = x;
	 if (typeof t === "object") {
			x = t.x;
			y = t.y || x;
	 }
	 if (x) {
			return "scale(" + x + " " + y + ") ";
	 }
	 return "";
}
function translate(x, y) {
	 var t = x;
	 if (typeof t === "object") {
			x = t.x;
			y = t.y;
	  }

	 if (x !== undefined && y !== undefined) {
			return "translate(" + x + " " + y + ") ";
	 }
	 if (x !== undefined) {
			return "translate(" + x + ") ";
	 }
	 return "";
}
function rotate(rotate, x, y) {
	 var t = rotate;
	 if (typeof t === "object") {
			rotate = t.rotate;
	 }
	 if (rotate && !x && !y) {
			return "rotate(" + rotate + ") ";
	 } else if (rotate) {
			return "rotate(" + rotate + " " + x + " " + y + ") ";
	 }
	 return "";
}
function transform(s, t, r) {
	 return scale(s) + translate(t) + rotate(r);
}
function path() {
	 var args = [];
	 _.each(arguments, function (a) {
			args.push(a);
	 });
	 return args.join(" ");
}

d3.util = {};
d3.util.d = path;
d3.util.transform = transform;
d3.util.translate = translate;
d3.util.scale = scale;
d3.util.rotate = rotate;
