var COMPILED = false;
var goog = goog || {};
goog.global = this;
goog.DEBUG = true;
goog.LOCALE = "en";
goog.provide = function(name) {
  if(!COMPILED) {
    if(goog.isProvided_(name)) {
      throw Error('Namespace "' + name + '" already declared.');
    }
    delete goog.implicitNamespaces_[name];
    var namespace = name;
    while(namespace = namespace.substring(0, namespace.lastIndexOf("."))) {
      if(goog.getObjectByName(namespace)) {
        break
      }
      goog.implicitNamespaces_[namespace] = true
    }
  }
  goog.exportPath_(name)
};
goog.setTestOnly = function(opt_message) {
  if(COMPILED && !goog.DEBUG) {
    opt_message = opt_message || "";
    throw Error("Importing test-only code into non-debug environment" + opt_message ? ": " + opt_message : ".");
  }
};
if(!COMPILED) {
  goog.isProvided_ = function(name) {
    return!goog.implicitNamespaces_[name] && !!goog.getObjectByName(name)
  };
  goog.implicitNamespaces_ = {}
}
goog.exportPath_ = function(name, opt_object, opt_objectToExportTo) {
  var parts = name.split(".");
  var cur = opt_objectToExportTo || goog.global;
  if(!(parts[0] in cur) && cur.execScript) {
    cur.execScript("var " + parts[0])
  }
  for(var part;parts.length && (part = parts.shift());) {
    if(!parts.length && goog.isDef(opt_object)) {
      cur[part] = opt_object
    }else {
      if(cur[part]) {
        cur = cur[part]
      }else {
        cur = cur[part] = {}
      }
    }
  }
};
goog.getObjectByName = function(name, opt_obj) {
  var parts = name.split(".");
  var cur = opt_obj || goog.global;
  for(var part;part = parts.shift();) {
    if(goog.isDefAndNotNull(cur[part])) {
      cur = cur[part]
    }else {
      return null
    }
  }
  return cur
};
goog.globalize = function(obj, opt_global) {
  var global = opt_global || goog.global;
  for(var x in obj) {
    global[x] = obj[x]
  }
};
goog.addDependency = function(relPath, provides, requires) {
  if(!COMPILED) {
    var provide, require;
    var path = relPath.replace(/\\/g, "/");
    var deps = goog.dependencies_;
    for(var i = 0;provide = provides[i];i++) {
      deps.nameToPath[provide] = path;
      if(!(path in deps.pathToNames)) {
        deps.pathToNames[path] = {}
      }
      deps.pathToNames[path][provide] = true
    }
    for(var j = 0;require = requires[j];j++) {
      if(!(path in deps.requires)) {
        deps.requires[path] = {}
      }
      deps.requires[path][require] = true
    }
  }
};
goog.ENABLE_DEBUG_LOADER = true;
goog.require = function(name) {
  if(!COMPILED) {
    if(goog.isProvided_(name)) {
      return
    }
    if(goog.ENABLE_DEBUG_LOADER) {
      var path = goog.getPathFromDeps_(name);
      if(path) {
        goog.included_[path] = true;
        goog.writeScripts_();
        return
      }
    }
    var errorMessage = "goog.require could not find: " + name;
    if(goog.global.console) {
      goog.global.console["error"](errorMessage)
    }
    throw Error(errorMessage);
  }
};
goog.basePath = "";
goog.global.CLOSURE_BASE_PATH;
goog.global.CLOSURE_NO_DEPS;
goog.global.CLOSURE_IMPORT_SCRIPT;
goog.nullFunction = function() {
};
goog.identityFunction = function(var_args) {
  return arguments[0]
};
goog.abstractMethod = function() {
  throw Error("unimplemented abstract method");
};
goog.addSingletonGetter = function(ctor) {
  ctor.getInstance = function() {
    return ctor.instance_ || (ctor.instance_ = new ctor)
  }
};
if(!COMPILED && goog.ENABLE_DEBUG_LOADER) {
  goog.included_ = {};
  goog.dependencies_ = {pathToNames:{}, nameToPath:{}, requires:{}, visited:{}, written:{}};
  goog.inHtmlDocument_ = function() {
    var doc = goog.global.document;
    return typeof doc != "undefined" && "write" in doc
  };
  goog.findBasePath_ = function() {
    if(goog.global.CLOSURE_BASE_PATH) {
      goog.basePath = goog.global.CLOSURE_BASE_PATH;
      return
    }else {
      if(!goog.inHtmlDocument_()) {
        return
      }
    }
    var doc = goog.global.document;
    var scripts = doc.getElementsByTagName("script");
    for(var i = scripts.length - 1;i >= 0;--i) {
      var src = scripts[i].src;
      var qmark = src.lastIndexOf("?");
      var l = qmark == -1 ? src.length : qmark;
      if(src.substr(l - 7, 7) == "base.js") {
        goog.basePath = src.substr(0, l - 7);
        return
      }
    }
  };
  goog.importScript_ = function(src) {
    var importScript = goog.global.CLOSURE_IMPORT_SCRIPT || goog.writeScriptTag_;
    if(!goog.dependencies_.written[src] && importScript(src)) {
      goog.dependencies_.written[src] = true
    }
  };
  goog.writeScriptTag_ = function(src) {
    if(goog.inHtmlDocument_()) {
      var doc = goog.global.document;
      doc.write('<script type="text/javascript" src="' + src + '"></' + "script>");
      return true
    }else {
      return false
    }
  };
  goog.writeScripts_ = function() {
    var scripts = [];
    var seenScript = {};
    var deps = goog.dependencies_;
    function visitNode(path) {
      if(path in deps.written) {
        return
      }
      if(path in deps.visited) {
        if(!(path in seenScript)) {
          seenScript[path] = true;
          scripts.push(path)
        }
        return
      }
      deps.visited[path] = true;
      if(path in deps.requires) {
        for(var requireName in deps.requires[path]) {
          if(!goog.isProvided_(requireName)) {
            if(requireName in deps.nameToPath) {
              visitNode(deps.nameToPath[requireName])
            }else {
              throw Error("Undefined nameToPath for " + requireName);
            }
          }
        }
      }
      if(!(path in seenScript)) {
        seenScript[path] = true;
        scripts.push(path)
      }
    }
    for(var path in goog.included_) {
      if(!deps.written[path]) {
        visitNode(path)
      }
    }
    for(var i = 0;i < scripts.length;i++) {
      if(scripts[i]) {
        goog.importScript_(goog.basePath + scripts[i])
      }else {
        throw Error("Undefined script input");
      }
    }
  };
  goog.getPathFromDeps_ = function(rule) {
    if(rule in goog.dependencies_.nameToPath) {
      return goog.dependencies_.nameToPath[rule]
    }else {
      return null
    }
  };
  goog.findBasePath_();
  if(!goog.global.CLOSURE_NO_DEPS) {
    goog.importScript_(goog.basePath + "deps.js")
  }
}
goog.typeOf = function(value) {
  var s = typeof value;
  if(s == "object") {
    if(value) {
      if(value instanceof Array) {
        return"array"
      }else {
        if(value instanceof Object) {
          return s
        }
      }
      var className = Object.prototype.toString.call(value);
      if(className == "[object Window]") {
        return"object"
      }
      if(className == "[object Array]" || typeof value.length == "number" && typeof value.splice != "undefined" && typeof value.propertyIsEnumerable != "undefined" && !value.propertyIsEnumerable("splice")) {
        return"array"
      }
      if(className == "[object Function]" || typeof value.call != "undefined" && typeof value.propertyIsEnumerable != "undefined" && !value.propertyIsEnumerable("call")) {
        return"function"
      }
    }else {
      return"null"
    }
  }else {
    if(s == "function" && typeof value.call == "undefined") {
      return"object"
    }
  }
  return s
};
goog.propertyIsEnumerableCustom_ = function(object, propName) {
  if(propName in object) {
    for(var key in object) {
      if(key == propName && Object.prototype.hasOwnProperty.call(object, propName)) {
        return true
      }
    }
  }
  return false
};
goog.propertyIsEnumerable_ = function(object, propName) {
  if(object instanceof Object) {
    return Object.prototype.propertyIsEnumerable.call(object, propName)
  }else {
    return goog.propertyIsEnumerableCustom_(object, propName)
  }
};
goog.isDef = function(val) {
  return val !== undefined
};
goog.isNull = function(val) {
  return val === null
};
goog.isDefAndNotNull = function(val) {
  return val != null
};
goog.isArray = function(val) {
  return goog.typeOf(val) == "array"
};
goog.isArrayLike = function(val) {
  var type = goog.typeOf(val);
  return type == "array" || type == "object" && typeof val.length == "number"
};
goog.isDateLike = function(val) {
  return goog.isObject(val) && typeof val.getFullYear == "function"
};
goog.isString = function(val) {
  return typeof val == "string"
};
goog.isBoolean = function(val) {
  return typeof val == "boolean"
};
goog.isNumber = function(val) {
  return typeof val == "number"
};
goog.isFunction = function(val) {
  return goog.typeOf(val) == "function"
};
goog.isObject = function(val) {
  var type = goog.typeOf(val);
  return type == "object" || type == "array" || type == "function"
};
goog.getUid = function(obj) {
  return obj[goog.UID_PROPERTY_] || (obj[goog.UID_PROPERTY_] = ++goog.uidCounter_)
};
goog.removeUid = function(obj) {
  if("removeAttribute" in obj) {
    obj.removeAttribute(goog.UID_PROPERTY_)
  }
  try {
    delete obj[goog.UID_PROPERTY_]
  }catch(ex) {
  }
};
goog.UID_PROPERTY_ = "closure_uid_" + Math.floor(Math.random() * 2147483648).toString(36);
goog.uidCounter_ = 0;
goog.getHashCode = goog.getUid;
goog.removeHashCode = goog.removeUid;
goog.cloneObject = function(obj) {
  var type = goog.typeOf(obj);
  if(type == "object" || type == "array") {
    if(obj.clone) {
      return obj.clone()
    }
    var clone = type == "array" ? [] : {};
    for(var key in obj) {
      clone[key] = goog.cloneObject(obj[key])
    }
    return clone
  }
  return obj
};
Object.prototype.clone;
goog.bindNative_ = function(fn, selfObj, var_args) {
  return fn.call.apply(fn.bind, arguments)
};
goog.bindJs_ = function(fn, selfObj, var_args) {
  if(!fn) {
    throw new Error;
  }
  if(arguments.length > 2) {
    var boundArgs = Array.prototype.slice.call(arguments, 2);
    return function() {
      var newArgs = Array.prototype.slice.call(arguments);
      Array.prototype.unshift.apply(newArgs, boundArgs);
      return fn.apply(selfObj, newArgs)
    }
  }else {
    return function() {
      return fn.apply(selfObj, arguments)
    }
  }
};
goog.bind = function(fn, selfObj, var_args) {
  if(Function.prototype.bind && Function.prototype.bind.toString().indexOf("native code") != -1) {
    goog.bind = goog.bindNative_
  }else {
    goog.bind = goog.bindJs_
  }
  return goog.bind.apply(null, arguments)
};
goog.partial = function(fn, var_args) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    var newArgs = Array.prototype.slice.call(arguments);
    newArgs.unshift.apply(newArgs, args);
    return fn.apply(this, newArgs)
  }
};
goog.mixin = function(target, source) {
  for(var x in source) {
    target[x] = source[x]
  }
};
goog.now = Date.now || function() {
  return+new Date
};
goog.globalEval = function(script) {
  if(goog.global.execScript) {
    goog.global.execScript(script, "JavaScript")
  }else {
    if(goog.global.eval) {
      if(goog.evalWorksForGlobals_ == null) {
        goog.global.eval("var _et_ = 1;");
        if(typeof goog.global["_et_"] != "undefined") {
          delete goog.global["_et_"];
          goog.evalWorksForGlobals_ = true
        }else {
          goog.evalWorksForGlobals_ = false
        }
      }
      if(goog.evalWorksForGlobals_) {
        goog.global.eval(script)
      }else {
        var doc = goog.global.document;
        var scriptElt = doc.createElement("script");
        scriptElt.type = "text/javascript";
        scriptElt.defer = false;
        scriptElt.appendChild(doc.createTextNode(script));
        doc.body.appendChild(scriptElt);
        doc.body.removeChild(scriptElt)
      }
    }else {
      throw Error("goog.globalEval not available");
    }
  }
};
goog.evalWorksForGlobals_ = null;
goog.cssNameMapping_;
goog.cssNameMappingStyle_;
goog.getCssName = function(className, opt_modifier) {
  var getMapping = function(cssName) {
    return goog.cssNameMapping_[cssName] || cssName
  };
  var renameByParts = function(cssName) {
    var parts = cssName.split("-");
    var mapped = [];
    for(var i = 0;i < parts.length;i++) {
      mapped.push(getMapping(parts[i]))
    }
    return mapped.join("-")
  };
  var rename;
  if(goog.cssNameMapping_) {
    rename = goog.cssNameMappingStyle_ == "BY_WHOLE" ? getMapping : renameByParts
  }else {
    rename = function(a) {
      return a
    }
  }
  if(opt_modifier) {
    return className + "-" + rename(opt_modifier)
  }else {
    return rename(className)
  }
};
goog.setCssNameMapping = function(mapping, opt_style) {
  goog.cssNameMapping_ = mapping;
  goog.cssNameMappingStyle_ = opt_style
};
goog.global.CLOSURE_CSS_NAME_MAPPING;
if(!COMPILED && goog.global.CLOSURE_CSS_NAME_MAPPING) {
  goog.cssNameMapping_ = goog.global.CLOSURE_CSS_NAME_MAPPING
}
goog.getMsg = function(str, opt_values) {
  var values = opt_values || {};
  for(var key in values) {
    var value = ("" + values[key]).replace(/\$/g, "$$$$");
    str = str.replace(new RegExp("\\{\\$" + key + "\\}", "gi"), value)
  }
  return str
};
goog.exportSymbol = function(publicPath, object, opt_objectToExportTo) {
  goog.exportPath_(publicPath, object, opt_objectToExportTo)
};
goog.exportProperty = function(object, publicName, symbol) {
  object[publicName] = symbol
};
goog.inherits = function(childCtor, parentCtor) {
  function tempCtor() {
  }
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor;
  childCtor.prototype.constructor = childCtor
};
goog.base = function(me, opt_methodName, var_args) {
  var caller = arguments.callee.caller;
  if(caller.superClass_) {
    return caller.superClass_.constructor.apply(me, Array.prototype.slice.call(arguments, 1))
  }
  var args = Array.prototype.slice.call(arguments, 2);
  var foundCaller = false;
  for(var ctor = me.constructor;ctor;ctor = ctor.superClass_ && ctor.superClass_.constructor) {
    if(ctor.prototype[opt_methodName] === caller) {
      foundCaller = true
    }else {
      if(foundCaller) {
        return ctor.prototype[opt_methodName].apply(me, args)
      }
    }
  }
  if(me[opt_methodName] === caller) {
    return me.constructor.prototype[opt_methodName].apply(me, args)
  }else {
    throw Error("goog.base called from a method of one name " + "to a method of a different name");
  }
};
goog.scope = function(fn) {
  fn.call(goog.global)
};
goog.provide("goog.string");
goog.provide("goog.string.Unicode");
goog.string.Unicode = {NBSP:"\u00a0"};
goog.string.startsWith = function(str, prefix) {
  return str.lastIndexOf(prefix, 0) == 0
};
goog.string.endsWith = function(str, suffix) {
  var l = str.length - suffix.length;
  return l >= 0 && str.indexOf(suffix, l) == l
};
goog.string.caseInsensitiveStartsWith = function(str, prefix) {
  return goog.string.caseInsensitiveCompare(prefix, str.substr(0, prefix.length)) == 0
};
goog.string.caseInsensitiveEndsWith = function(str, suffix) {
  return goog.string.caseInsensitiveCompare(suffix, str.substr(str.length - suffix.length, suffix.length)) == 0
};
goog.string.subs = function(str, var_args) {
  for(var i = 1;i < arguments.length;i++) {
    var replacement = String(arguments[i]).replace(/\$/g, "$$$$");
    str = str.replace(/\%s/, replacement)
  }
  return str
};
goog.string.collapseWhitespace = function(str) {
  return str.replace(/[\s\xa0]+/g, " ").replace(/^\s+|\s+$/g, "")
};
goog.string.isEmpty = function(str) {
  return/^[\s\xa0]*$/.test(str)
};
goog.string.isEmptySafe = function(str) {
  return goog.string.isEmpty(goog.string.makeSafe(str))
};
goog.string.isBreakingWhitespace = function(str) {
  return!/[^\t\n\r ]/.test(str)
};
goog.string.isAlpha = function(str) {
  return!/[^a-zA-Z]/.test(str)
};
goog.string.isNumeric = function(str) {
  return!/[^0-9]/.test(str)
};
goog.string.isAlphaNumeric = function(str) {
  return!/[^a-zA-Z0-9]/.test(str)
};
goog.string.isSpace = function(ch) {
  return ch == " "
};
goog.string.isUnicodeChar = function(ch) {
  return ch.length == 1 && ch >= " " && ch <= "~" || ch >= "\u0080" && ch <= "\ufffd"
};
goog.string.stripNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)+/g, " ")
};
goog.string.canonicalizeNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)/g, "\n")
};
goog.string.normalizeWhitespace = function(str) {
  return str.replace(/\xa0|\s/g, " ")
};
goog.string.normalizeSpaces = function(str) {
  return str.replace(/\xa0|[ \t]+/g, " ")
};
goog.string.collapseBreakingSpaces = function(str) {
  return str.replace(/[\t\r\n ]+/g, " ").replace(/^[\t\r\n ]+|[\t\r\n ]+$/g, "")
};
goog.string.trim = function(str) {
  return str.replace(/^[\s\xa0]+|[\s\xa0]+$/g, "")
};
goog.string.trimLeft = function(str) {
  return str.replace(/^[\s\xa0]+/, "")
};
goog.string.trimRight = function(str) {
  return str.replace(/[\s\xa0]+$/, "")
};
goog.string.caseInsensitiveCompare = function(str1, str2) {
  var test1 = String(str1).toLowerCase();
  var test2 = String(str2).toLowerCase();
  if(test1 < test2) {
    return-1
  }else {
    if(test1 == test2) {
      return 0
    }else {
      return 1
    }
  }
};
goog.string.numerateCompareRegExp_ = /(\.\d+)|(\d+)|(\D+)/g;
goog.string.numerateCompare = function(str1, str2) {
  if(str1 == str2) {
    return 0
  }
  if(!str1) {
    return-1
  }
  if(!str2) {
    return 1
  }
  var tokens1 = str1.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var tokens2 = str2.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var count = Math.min(tokens1.length, tokens2.length);
  for(var i = 0;i < count;i++) {
    var a = tokens1[i];
    var b = tokens2[i];
    if(a != b) {
      var num1 = parseInt(a, 10);
      if(!isNaN(num1)) {
        var num2 = parseInt(b, 10);
        if(!isNaN(num2) && num1 - num2) {
          return num1 - num2
        }
      }
      return a < b ? -1 : 1
    }
  }
  if(tokens1.length != tokens2.length) {
    return tokens1.length - tokens2.length
  }
  return str1 < str2 ? -1 : 1
};
goog.string.encodeUriRegExp_ = /^[a-zA-Z0-9\-_.!~*'()]*$/;
goog.string.urlEncode = function(str) {
  str = String(str);
  if(!goog.string.encodeUriRegExp_.test(str)) {
    return encodeURIComponent(str)
  }
  return str
};
goog.string.urlDecode = function(str) {
  return decodeURIComponent(str.replace(/\+/g, " "))
};
goog.string.newLineToBr = function(str, opt_xml) {
  return str.replace(/(\r\n|\r|\n)/g, opt_xml ? "<br />" : "<br>")
};
goog.string.htmlEscape = function(str, opt_isLikelyToContainHtmlChars) {
  if(opt_isLikelyToContainHtmlChars) {
    return str.replace(goog.string.amperRe_, "&amp;").replace(goog.string.ltRe_, "&lt;").replace(goog.string.gtRe_, "&gt;").replace(goog.string.quotRe_, "&quot;")
  }else {
    if(!goog.string.allRe_.test(str)) {
      return str
    }
    if(str.indexOf("&") != -1) {
      str = str.replace(goog.string.amperRe_, "&amp;")
    }
    if(str.indexOf("<") != -1) {
      str = str.replace(goog.string.ltRe_, "&lt;")
    }
    if(str.indexOf(">") != -1) {
      str = str.replace(goog.string.gtRe_, "&gt;")
    }
    if(str.indexOf('"') != -1) {
      str = str.replace(goog.string.quotRe_, "&quot;")
    }
    return str
  }
};
goog.string.amperRe_ = /&/g;
goog.string.ltRe_ = /</g;
goog.string.gtRe_ = />/g;
goog.string.quotRe_ = /\"/g;
goog.string.allRe_ = /[&<>\"]/;
goog.string.unescapeEntities = function(str) {
  if(goog.string.contains(str, "&")) {
    if("document" in goog.global) {
      return goog.string.unescapeEntitiesUsingDom_(str)
    }else {
      return goog.string.unescapePureXmlEntities_(str)
    }
  }
  return str
};
goog.string.unescapeEntitiesUsingDom_ = function(str) {
  var seen = {"&amp;":"&", "&lt;":"<", "&gt;":">", "&quot;":'"'};
  var div = document.createElement("div");
  return str.replace(goog.string.HTML_ENTITY_PATTERN_, function(s, entity) {
    var value = seen[s];
    if(value) {
      return value
    }
    if(entity.charAt(0) == "#") {
      var n = Number("0" + entity.substr(1));
      if(!isNaN(n)) {
        value = String.fromCharCode(n)
      }
    }
    if(!value) {
      div.innerHTML = s + " ";
      value = div.firstChild.nodeValue.slice(0, -1)
    }
    return seen[s] = value
  })
};
goog.string.unescapePureXmlEntities_ = function(str) {
  return str.replace(/&([^;]+);/g, function(s, entity) {
    switch(entity) {
      case "amp":
        return"&";
      case "lt":
        return"<";
      case "gt":
        return">";
      case "quot":
        return'"';
      default:
        if(entity.charAt(0) == "#") {
          var n = Number("0" + entity.substr(1));
          if(!isNaN(n)) {
            return String.fromCharCode(n)
          }
        }
        return s
    }
  })
};
goog.string.HTML_ENTITY_PATTERN_ = /&([^;\s<&]+);?/g;
goog.string.whitespaceEscape = function(str, opt_xml) {
  return goog.string.newLineToBr(str.replace(/  /g, " &#160;"), opt_xml)
};
goog.string.stripQuotes = function(str, quoteChars) {
  var length = quoteChars.length;
  for(var i = 0;i < length;i++) {
    var quoteChar = length == 1 ? quoteChars : quoteChars.charAt(i);
    if(str.charAt(0) == quoteChar && str.charAt(str.length - 1) == quoteChar) {
      return str.substring(1, str.length - 1)
    }
  }
  return str
};
goog.string.truncate = function(str, chars, opt_protectEscapedCharacters) {
  if(opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str)
  }
  if(str.length > chars) {
    str = str.substring(0, chars - 3) + "..."
  }
  if(opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str)
  }
  return str
};
goog.string.truncateMiddle = function(str, chars, opt_protectEscapedCharacters, opt_trailingChars) {
  if(opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str)
  }
  if(opt_trailingChars && str.length > chars) {
    if(opt_trailingChars > chars) {
      opt_trailingChars = chars
    }
    var endPoint = str.length - opt_trailingChars;
    var startPoint = chars - opt_trailingChars;
    str = str.substring(0, startPoint) + "..." + str.substring(endPoint)
  }else {
    if(str.length > chars) {
      var half = Math.floor(chars / 2);
      var endPos = str.length - half;
      half += chars % 2;
      str = str.substring(0, half) + "..." + str.substring(endPos)
    }
  }
  if(opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str)
  }
  return str
};
goog.string.specialEscapeChars_ = {"\x00":"\\0", "\u0008":"\\b", "\u000c":"\\f", "\n":"\\n", "\r":"\\r", "\t":"\\t", "\x0B":"\\x0B", '"':'\\"', "\\":"\\\\"};
goog.string.jsEscapeCache_ = {"'":"\\'"};
goog.string.quote = function(s) {
  s = String(s);
  if(s.quote) {
    return s.quote()
  }else {
    var sb = ['"'];
    for(var i = 0;i < s.length;i++) {
      var ch = s.charAt(i);
      var cc = ch.charCodeAt(0);
      sb[i + 1] = goog.string.specialEscapeChars_[ch] || (cc > 31 && cc < 127 ? ch : goog.string.escapeChar(ch))
    }
    sb.push('"');
    return sb.join("")
  }
};
goog.string.escapeString = function(str) {
  var sb = [];
  for(var i = 0;i < str.length;i++) {
    sb[i] = goog.string.escapeChar(str.charAt(i))
  }
  return sb.join("")
};
goog.string.escapeChar = function(c) {
  if(c in goog.string.jsEscapeCache_) {
    return goog.string.jsEscapeCache_[c]
  }
  if(c in goog.string.specialEscapeChars_) {
    return goog.string.jsEscapeCache_[c] = goog.string.specialEscapeChars_[c]
  }
  var rv = c;
  var cc = c.charCodeAt(0);
  if(cc > 31 && cc < 127) {
    rv = c
  }else {
    if(cc < 256) {
      rv = "\\x";
      if(cc < 16 || cc > 256) {
        rv += "0"
      }
    }else {
      rv = "\\u";
      if(cc < 4096) {
        rv += "0"
      }
    }
    rv += cc.toString(16).toUpperCase()
  }
  return goog.string.jsEscapeCache_[c] = rv
};
goog.string.toMap = function(s) {
  var rv = {};
  for(var i = 0;i < s.length;i++) {
    rv[s.charAt(i)] = true
  }
  return rv
};
goog.string.contains = function(s, ss) {
  return s.indexOf(ss) != -1
};
goog.string.removeAt = function(s, index, stringLength) {
  var resultStr = s;
  if(index >= 0 && index < s.length && stringLength > 0) {
    resultStr = s.substr(0, index) + s.substr(index + stringLength, s.length - index - stringLength)
  }
  return resultStr
};
goog.string.remove = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), "");
  return s.replace(re, "")
};
goog.string.removeAll = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), "g");
  return s.replace(re, "")
};
goog.string.regExpEscape = function(s) {
  return String(s).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, "\\$1").replace(/\x08/g, "\\x08")
};
goog.string.repeat = function(string, length) {
  return(new Array(length + 1)).join(string)
};
goog.string.padNumber = function(num, length, opt_precision) {
  var s = goog.isDef(opt_precision) ? num.toFixed(opt_precision) : String(num);
  var index = s.indexOf(".");
  if(index == -1) {
    index = s.length
  }
  return goog.string.repeat("0", Math.max(0, length - index)) + s
};
goog.string.makeSafe = function(obj) {
  return obj == null ? "" : String(obj)
};
goog.string.buildString = function(var_args) {
  return Array.prototype.join.call(arguments, "")
};
goog.string.getRandomString = function() {
  var x = 2147483648;
  return Math.floor(Math.random() * x).toString(36) + Math.abs(Math.floor(Math.random() * x) ^ goog.now()).toString(36)
};
goog.string.compareVersions = function(version1, version2) {
  var order = 0;
  var v1Subs = goog.string.trim(String(version1)).split(".");
  var v2Subs = goog.string.trim(String(version2)).split(".");
  var subCount = Math.max(v1Subs.length, v2Subs.length);
  for(var subIdx = 0;order == 0 && subIdx < subCount;subIdx++) {
    var v1Sub = v1Subs[subIdx] || "";
    var v2Sub = v2Subs[subIdx] || "";
    var v1CompParser = new RegExp("(\\d*)(\\D*)", "g");
    var v2CompParser = new RegExp("(\\d*)(\\D*)", "g");
    do {
      var v1Comp = v1CompParser.exec(v1Sub) || ["", "", ""];
      var v2Comp = v2CompParser.exec(v2Sub) || ["", "", ""];
      if(v1Comp[0].length == 0 && v2Comp[0].length == 0) {
        break
      }
      var v1CompNum = v1Comp[1].length == 0 ? 0 : parseInt(v1Comp[1], 10);
      var v2CompNum = v2Comp[1].length == 0 ? 0 : parseInt(v2Comp[1], 10);
      order = goog.string.compareElements_(v1CompNum, v2CompNum) || goog.string.compareElements_(v1Comp[2].length == 0, v2Comp[2].length == 0) || goog.string.compareElements_(v1Comp[2], v2Comp[2])
    }while(order == 0)
  }
  return order
};
goog.string.compareElements_ = function(left, right) {
  if(left < right) {
    return-1
  }else {
    if(left > right) {
      return 1
    }
  }
  return 0
};
goog.string.HASHCODE_MAX_ = 4294967296;
goog.string.hashCode = function(str) {
  var result = 0;
  for(var i = 0;i < str.length;++i) {
    result = 31 * result + str.charCodeAt(i);
    result %= goog.string.HASHCODE_MAX_
  }
  return result
};
goog.string.uniqueStringCounter_ = Math.random() * 2147483648 | 0;
goog.string.createUniqueString = function() {
  return"goog_" + goog.string.uniqueStringCounter_++
};
goog.string.toNumber = function(str) {
  var num = Number(str);
  if(num == 0 && goog.string.isEmpty(str)) {
    return NaN
  }
  return num
};
goog.string.toCamelCaseCache_ = {};
goog.string.toCamelCase = function(str) {
  return goog.string.toCamelCaseCache_[str] || (goog.string.toCamelCaseCache_[str] = String(str).replace(/\-([a-z])/g, function(all, match) {
    return match.toUpperCase()
  }))
};
goog.string.toSelectorCaseCache_ = {};
goog.string.toSelectorCase = function(str) {
  return goog.string.toSelectorCaseCache_[str] || (goog.string.toSelectorCaseCache_[str] = String(str).replace(/([A-Z])/g, "-$1").toLowerCase())
};
goog.provide("goog.debug.Error");
goog.debug.Error = function(opt_msg) {
  this.stack = (new Error).stack || "";
  if(opt_msg) {
    this.message = String(opt_msg)
  }
};
goog.inherits(goog.debug.Error, Error);
goog.debug.Error.prototype.name = "CustomError";
goog.provide("goog.asserts");
goog.provide("goog.asserts.AssertionError");
goog.require("goog.debug.Error");
goog.require("goog.string");
goog.asserts.ENABLE_ASSERTS = goog.DEBUG;
goog.asserts.AssertionError = function(messagePattern, messageArgs) {
  messageArgs.unshift(messagePattern);
  goog.debug.Error.call(this, goog.string.subs.apply(null, messageArgs));
  messageArgs.shift();
  this.messagePattern = messagePattern
};
goog.inherits(goog.asserts.AssertionError, goog.debug.Error);
goog.asserts.AssertionError.prototype.name = "AssertionError";
goog.asserts.doAssertFailure_ = function(defaultMessage, defaultArgs, givenMessage, givenArgs) {
  var message = "Assertion failed";
  if(givenMessage) {
    message += ": " + givenMessage;
    var args = givenArgs
  }else {
    if(defaultMessage) {
      message += ": " + defaultMessage;
      args = defaultArgs
    }
  }
  throw new goog.asserts.AssertionError("" + message, args || []);
};
goog.asserts.assert = function(condition, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !condition) {
    goog.asserts.doAssertFailure_("", null, opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return condition
};
goog.asserts.fail = function(opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS) {
    throw new goog.asserts.AssertionError("Failure" + (opt_message ? ": " + opt_message : ""), Array.prototype.slice.call(arguments, 1));
  }
};
goog.asserts.assertNumber = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isNumber(value)) {
    goog.asserts.doAssertFailure_("Expected number but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertString = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isString(value)) {
    goog.asserts.doAssertFailure_("Expected string but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertFunction = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isFunction(value)) {
    goog.asserts.doAssertFailure_("Expected function but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertObject = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isObject(value)) {
    goog.asserts.doAssertFailure_("Expected object but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertArray = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isArray(value)) {
    goog.asserts.doAssertFailure_("Expected array but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertBoolean = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isBoolean(value)) {
    goog.asserts.doAssertFailure_("Expected boolean but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertInstanceof = function(value, type, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !(value instanceof type)) {
    goog.asserts.doAssertFailure_("instanceof check failed.", null, opt_message, Array.prototype.slice.call(arguments, 3))
  }
};
goog.provide("goog.array");
goog.provide("goog.array.ArrayLike");
goog.require("goog.asserts");
goog.NATIVE_ARRAY_PROTOTYPES = true;
goog.array.ArrayLike;
goog.array.peek = function(array) {
  return array[array.length - 1]
};
goog.array.ARRAY_PROTOTYPE_ = Array.prototype;
goog.array.indexOf = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.indexOf ? function(arr, obj, opt_fromIndex) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.indexOf.call(arr, obj, opt_fromIndex)
} : function(arr, obj, opt_fromIndex) {
  var fromIndex = opt_fromIndex == null ? 0 : opt_fromIndex < 0 ? Math.max(0, arr.length + opt_fromIndex) : opt_fromIndex;
  if(goog.isString(arr)) {
    if(!goog.isString(obj) || obj.length != 1) {
      return-1
    }
    return arr.indexOf(obj, fromIndex)
  }
  for(var i = fromIndex;i < arr.length;i++) {
    if(i in arr && arr[i] === obj) {
      return i
    }
  }
  return-1
};
goog.array.lastIndexOf = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.lastIndexOf ? function(arr, obj, opt_fromIndex) {
  goog.asserts.assert(arr.length != null);
  var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;
  return goog.array.ARRAY_PROTOTYPE_.lastIndexOf.call(arr, obj, fromIndex)
} : function(arr, obj, opt_fromIndex) {
  var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;
  if(fromIndex < 0) {
    fromIndex = Math.max(0, arr.length + fromIndex)
  }
  if(goog.isString(arr)) {
    if(!goog.isString(obj) || obj.length != 1) {
      return-1
    }
    return arr.lastIndexOf(obj, fromIndex)
  }
  for(var i = fromIndex;i >= 0;i--) {
    if(i in arr && arr[i] === obj) {
      return i
    }
  }
  return-1
};
goog.array.forEach = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.forEach ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  goog.array.ARRAY_PROTOTYPE_.forEach.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2) {
      f.call(opt_obj, arr2[i], i, arr)
    }
  }
};
goog.array.forEachRight = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = l - 1;i >= 0;--i) {
    if(i in arr2) {
      f.call(opt_obj, arr2[i], i, arr)
    }
  }
};
goog.array.filter = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.filter ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.filter.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var res = [];
  var resLength = 0;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2) {
      var val = arr2[i];
      if(f.call(opt_obj, val, i, arr)) {
        res[resLength++] = val
      }
    }
  }
  return res
};
goog.array.map = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.map ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.map.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var res = new Array(l);
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2) {
      res[i] = f.call(opt_obj, arr2[i], i, arr)
    }
  }
  return res
};
goog.array.reduce = function(arr, f, val, opt_obj) {
  if(arr.reduce) {
    if(opt_obj) {
      return arr.reduce(goog.bind(f, opt_obj), val)
    }else {
      return arr.reduce(f, val)
    }
  }
  var rval = val;
  goog.array.forEach(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr)
  });
  return rval
};
goog.array.reduceRight = function(arr, f, val, opt_obj) {
  if(arr.reduceRight) {
    if(opt_obj) {
      return arr.reduceRight(goog.bind(f, opt_obj), val)
    }else {
      return arr.reduceRight(f, val)
    }
  }
  var rval = val;
  goog.array.forEachRight(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr)
  });
  return rval
};
goog.array.some = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.some ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.some.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return true
    }
  }
  return false
};
goog.array.every = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.every ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.every.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2 && !f.call(opt_obj, arr2[i], i, arr)) {
      return false
    }
  }
  return true
};
goog.array.find = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i]
};
goog.array.findIndex = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i
    }
  }
  return-1
};
goog.array.findRight = function(arr, f, opt_obj) {
  var i = goog.array.findIndexRight(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i]
};
goog.array.findIndexRight = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = l - 1;i >= 0;i--) {
    if(i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i
    }
  }
  return-1
};
goog.array.contains = function(arr, obj) {
  return goog.array.indexOf(arr, obj) >= 0
};
goog.array.isEmpty = function(arr) {
  return arr.length == 0
};
goog.array.clear = function(arr) {
  if(!goog.isArray(arr)) {
    for(var i = arr.length - 1;i >= 0;i--) {
      delete arr[i]
    }
  }
  arr.length = 0
};
goog.array.insert = function(arr, obj) {
  if(!goog.array.contains(arr, obj)) {
    arr.push(obj)
  }
};
goog.array.insertAt = function(arr, obj, opt_i) {
  goog.array.splice(arr, opt_i, 0, obj)
};
goog.array.insertArrayAt = function(arr, elementsToAdd, opt_i) {
  goog.partial(goog.array.splice, arr, opt_i, 0).apply(null, elementsToAdd)
};
goog.array.insertBefore = function(arr, obj, opt_obj2) {
  var i;
  if(arguments.length == 2 || (i = goog.array.indexOf(arr, opt_obj2)) < 0) {
    arr.push(obj)
  }else {
    goog.array.insertAt(arr, obj, i)
  }
};
goog.array.remove = function(arr, obj) {
  var i = goog.array.indexOf(arr, obj);
  var rv;
  if(rv = i >= 0) {
    goog.array.removeAt(arr, i)
  }
  return rv
};
goog.array.removeAt = function(arr, i) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.splice.call(arr, i, 1).length == 1
};
goog.array.removeIf = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  if(i >= 0) {
    goog.array.removeAt(arr, i);
    return true
  }
  return false
};
goog.array.concat = function(var_args) {
  return goog.array.ARRAY_PROTOTYPE_.concat.apply(goog.array.ARRAY_PROTOTYPE_, arguments)
};
goog.array.clone = function(arr) {
  if(goog.isArray(arr)) {
    return goog.array.concat(arr)
  }else {
    var rv = [];
    for(var i = 0, len = arr.length;i < len;i++) {
      rv[i] = arr[i]
    }
    return rv
  }
};
goog.array.toArray = function(object) {
  if(goog.isArray(object)) {
    return goog.array.concat(object)
  }
  return goog.array.clone(object)
};
goog.array.extend = function(arr1, var_args) {
  for(var i = 1;i < arguments.length;i++) {
    var arr2 = arguments[i];
    var isArrayLike;
    if(goog.isArray(arr2) || (isArrayLike = goog.isArrayLike(arr2)) && arr2.hasOwnProperty("callee")) {
      arr1.push.apply(arr1, arr2)
    }else {
      if(isArrayLike) {
        var len1 = arr1.length;
        var len2 = arr2.length;
        for(var j = 0;j < len2;j++) {
          arr1[len1 + j] = arr2[j]
        }
      }else {
        arr1.push(arr2)
      }
    }
  }
};
goog.array.splice = function(arr, index, howMany, var_args) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.splice.apply(arr, goog.array.slice(arguments, 1))
};
goog.array.slice = function(arr, start, opt_end) {
  goog.asserts.assert(arr.length != null);
  if(arguments.length <= 2) {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start)
  }else {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start, opt_end)
  }
};
goog.array.removeDuplicates = function(arr, opt_rv) {
  var returnArray = opt_rv || arr;
  var seen = {}, cursorInsert = 0, cursorRead = 0;
  while(cursorRead < arr.length) {
    var current = arr[cursorRead++];
    var key = goog.isObject(current) ? "o" + goog.getUid(current) : (typeof current).charAt(0) + current;
    if(!Object.prototype.hasOwnProperty.call(seen, key)) {
      seen[key] = true;
      returnArray[cursorInsert++] = current
    }
  }
  returnArray.length = cursorInsert
};
goog.array.binarySearch = function(arr, target, opt_compareFn) {
  return goog.array.binarySearch_(arr, opt_compareFn || goog.array.defaultCompare, false, target)
};
goog.array.binarySelect = function(arr, evaluator, opt_obj) {
  return goog.array.binarySearch_(arr, evaluator, true, undefined, opt_obj)
};
goog.array.binarySearch_ = function(arr, compareFn, isEvaluator, opt_target, opt_selfObj) {
  var left = 0;
  var right = arr.length;
  var found;
  while(left < right) {
    var middle = left + right >> 1;
    var compareResult;
    if(isEvaluator) {
      compareResult = compareFn.call(opt_selfObj, arr[middle], middle, arr)
    }else {
      compareResult = compareFn(opt_target, arr[middle])
    }
    if(compareResult > 0) {
      left = middle + 1
    }else {
      right = middle;
      found = !compareResult
    }
  }
  return found ? left : ~left
};
goog.array.sort = function(arr, opt_compareFn) {
  goog.asserts.assert(arr.length != null);
  goog.array.ARRAY_PROTOTYPE_.sort.call(arr, opt_compareFn || goog.array.defaultCompare)
};
goog.array.stableSort = function(arr, opt_compareFn) {
  for(var i = 0;i < arr.length;i++) {
    arr[i] = {index:i, value:arr[i]}
  }
  var valueCompareFn = opt_compareFn || goog.array.defaultCompare;
  function stableCompareFn(obj1, obj2) {
    return valueCompareFn(obj1.value, obj2.value) || obj1.index - obj2.index
  }
  goog.array.sort(arr, stableCompareFn);
  for(var i = 0;i < arr.length;i++) {
    arr[i] = arr[i].value
  }
};
goog.array.sortObjectsByKey = function(arr, key, opt_compareFn) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  goog.array.sort(arr, function(a, b) {
    return compare(a[key], b[key])
  })
};
goog.array.isSorted = function(arr, opt_compareFn, opt_strict) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  for(var i = 1;i < arr.length;i++) {
    var compareResult = compare(arr[i - 1], arr[i]);
    if(compareResult > 0 || compareResult == 0 && opt_strict) {
      return false
    }
  }
  return true
};
goog.array.equals = function(arr1, arr2, opt_equalsFn) {
  if(!goog.isArrayLike(arr1) || !goog.isArrayLike(arr2) || arr1.length != arr2.length) {
    return false
  }
  var l = arr1.length;
  var equalsFn = opt_equalsFn || goog.array.defaultCompareEquality;
  for(var i = 0;i < l;i++) {
    if(!equalsFn(arr1[i], arr2[i])) {
      return false
    }
  }
  return true
};
goog.array.compare = function(arr1, arr2, opt_equalsFn) {
  return goog.array.equals(arr1, arr2, opt_equalsFn)
};
goog.array.compare3 = function(arr1, arr2, opt_compareFn) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  var l = Math.min(arr1.length, arr2.length);
  for(var i = 0;i < l;i++) {
    var result = compare(arr1[i], arr2[i]);
    if(result != 0) {
      return result
    }
  }
  return goog.array.defaultCompare(arr1.length, arr2.length)
};
goog.array.defaultCompare = function(a, b) {
  return a > b ? 1 : a < b ? -1 : 0
};
goog.array.defaultCompareEquality = function(a, b) {
  return a === b
};
goog.array.binaryInsert = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  if(index < 0) {
    goog.array.insertAt(array, value, -(index + 1));
    return true
  }
  return false
};
goog.array.binaryRemove = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  return index >= 0 ? goog.array.removeAt(array, index) : false
};
goog.array.bucket = function(array, sorter) {
  var buckets = {};
  for(var i = 0;i < array.length;i++) {
    var value = array[i];
    var key = sorter(value, i, array);
    if(goog.isDef(key)) {
      var bucket = buckets[key] || (buckets[key] = []);
      bucket.push(value)
    }
  }
  return buckets
};
goog.array.repeat = function(value, n) {
  var array = [];
  for(var i = 0;i < n;i++) {
    array[i] = value
  }
  return array
};
goog.array.flatten = function(var_args) {
  var result = [];
  for(var i = 0;i < arguments.length;i++) {
    var element = arguments[i];
    if(goog.isArray(element)) {
      result.push.apply(result, goog.array.flatten.apply(null, element))
    }else {
      result.push(element)
    }
  }
  return result
};
goog.array.rotate = function(array, n) {
  goog.asserts.assert(array.length != null);
  if(array.length) {
    n %= array.length;
    if(n > 0) {
      goog.array.ARRAY_PROTOTYPE_.unshift.apply(array, array.splice(-n, n))
    }else {
      if(n < 0) {
        goog.array.ARRAY_PROTOTYPE_.push.apply(array, array.splice(0, -n))
      }
    }
  }
  return array
};
goog.array.zip = function(var_args) {
  if(!arguments.length) {
    return[]
  }
  var result = [];
  for(var i = 0;true;i++) {
    var value = [];
    for(var j = 0;j < arguments.length;j++) {
      var arr = arguments[j];
      if(i >= arr.length) {
        return result
      }
      value.push(arr[i])
    }
    result.push(value)
  }
};
goog.array.shuffle = function(arr, opt_randFn) {
  var randFn = opt_randFn || Math.random;
  for(var i = arr.length - 1;i > 0;i--) {
    var j = Math.floor(randFn() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp
  }
};
goog.provide("goog.object");
goog.object.forEach = function(obj, f, opt_obj) {
  for(var key in obj) {
    f.call(opt_obj, obj[key], key, obj)
  }
};
goog.object.filter = function(obj, f, opt_obj) {
  var res = {};
  for(var key in obj) {
    if(f.call(opt_obj, obj[key], key, obj)) {
      res[key] = obj[key]
    }
  }
  return res
};
goog.object.map = function(obj, f, opt_obj) {
  var res = {};
  for(var key in obj) {
    res[key] = f.call(opt_obj, obj[key], key, obj)
  }
  return res
};
goog.object.some = function(obj, f, opt_obj) {
  for(var key in obj) {
    if(f.call(opt_obj, obj[key], key, obj)) {
      return true
    }
  }
  return false
};
goog.object.every = function(obj, f, opt_obj) {
  for(var key in obj) {
    if(!f.call(opt_obj, obj[key], key, obj)) {
      return false
    }
  }
  return true
};
goog.object.getCount = function(obj) {
  var rv = 0;
  for(var key in obj) {
    rv++
  }
  return rv
};
goog.object.getAnyKey = function(obj) {
  for(var key in obj) {
    return key
  }
};
goog.object.getAnyValue = function(obj) {
  for(var key in obj) {
    return obj[key]
  }
};
goog.object.contains = function(obj, val) {
  return goog.object.containsValue(obj, val)
};
goog.object.getValues = function(obj) {
  var res = [];
  var i = 0;
  for(var key in obj) {
    res[i++] = obj[key]
  }
  return res
};
goog.object.getKeys = function(obj) {
  var res = [];
  var i = 0;
  for(var key in obj) {
    res[i++] = key
  }
  return res
};
goog.object.getValueByKeys = function(obj, var_args) {
  var isArrayLike = goog.isArrayLike(var_args);
  var keys = isArrayLike ? var_args : arguments;
  for(var i = isArrayLike ? 0 : 1;i < keys.length;i++) {
    obj = obj[keys[i]];
    if(!goog.isDef(obj)) {
      break
    }
  }
  return obj
};
goog.object.containsKey = function(obj, key) {
  return key in obj
};
goog.object.containsValue = function(obj, val) {
  for(var key in obj) {
    if(obj[key] == val) {
      return true
    }
  }
  return false
};
goog.object.findKey = function(obj, f, opt_this) {
  for(var key in obj) {
    if(f.call(opt_this, obj[key], key, obj)) {
      return key
    }
  }
  return undefined
};
goog.object.findValue = function(obj, f, opt_this) {
  var key = goog.object.findKey(obj, f, opt_this);
  return key && obj[key]
};
goog.object.isEmpty = function(obj) {
  for(var key in obj) {
    return false
  }
  return true
};
goog.object.clear = function(obj) {
  for(var i in obj) {
    delete obj[i]
  }
};
goog.object.remove = function(obj, key) {
  var rv;
  if(rv = key in obj) {
    delete obj[key]
  }
  return rv
};
goog.object.add = function(obj, key, val) {
  if(key in obj) {
    throw Error('The object already contains the key "' + key + '"');
  }
  goog.object.set(obj, key, val)
};
goog.object.get = function(obj, key, opt_val) {
  if(key in obj) {
    return obj[key]
  }
  return opt_val
};
goog.object.set = function(obj, key, value) {
  obj[key] = value
};
goog.object.setIfUndefined = function(obj, key, value) {
  return key in obj ? obj[key] : obj[key] = value
};
goog.object.clone = function(obj) {
  var res = {};
  for(var key in obj) {
    res[key] = obj[key]
  }
  return res
};
goog.object.unsafeClone = function(obj) {
  var type = goog.typeOf(obj);
  if(type == "object" || type == "array") {
    if(obj.clone) {
      return obj.clone()
    }
    var clone = type == "array" ? [] : {};
    for(var key in obj) {
      clone[key] = goog.object.unsafeClone(obj[key])
    }
    return clone
  }
  return obj
};
goog.object.transpose = function(obj) {
  var transposed = {};
  for(var key in obj) {
    transposed[obj[key]] = key
  }
  return transposed
};
goog.object.PROTOTYPE_FIELDS_ = ["constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf"];
goog.object.extend = function(target, var_args) {
  var key, source;
  for(var i = 1;i < arguments.length;i++) {
    source = arguments[i];
    for(key in source) {
      target[key] = source[key]
    }
    for(var j = 0;j < goog.object.PROTOTYPE_FIELDS_.length;j++) {
      key = goog.object.PROTOTYPE_FIELDS_[j];
      if(Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key]
      }
    }
  }
};
goog.object.create = function(var_args) {
  var argLength = arguments.length;
  if(argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.create.apply(null, arguments[0])
  }
  if(argLength % 2) {
    throw Error("Uneven number of arguments");
  }
  var rv = {};
  for(var i = 0;i < argLength;i += 2) {
    rv[arguments[i]] = arguments[i + 1]
  }
  return rv
};
goog.object.createSet = function(var_args) {
  var argLength = arguments.length;
  if(argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.createSet.apply(null, arguments[0])
  }
  var rv = {};
  for(var i = 0;i < argLength;i++) {
    rv[arguments[i]] = true
  }
  return rv
};
goog.provide("goog.string.format");
goog.require("goog.string");
goog.string.format = function(formatString, var_args) {
  var args = Array.prototype.slice.call(arguments);
  var template = args.shift();
  if(typeof template == "undefined") {
    throw Error("[goog.string.format] Template required");
  }
  var formatRe = /%([0\-\ \+]*)(\d+)?(\.(\d+))?([%sfdiu])/g;
  function replacerDemuxer(match, flags, width, dotp, precision, type, offset, wholeString) {
    if(type == "%") {
      return"%"
    }
    var value = args.shift();
    if(typeof value == "undefined") {
      throw Error("[goog.string.format] Not enough arguments");
    }
    arguments[0] = value;
    return goog.string.format.demuxes_[type].apply(null, arguments)
  }
  return template.replace(formatRe, replacerDemuxer)
};
goog.string.format.demuxes_ = {};
goog.string.format.demuxes_["s"] = function(value, flags, width, dotp, precision, type, offset, wholeString) {
  var replacement = value;
  if(isNaN(width) || width == "" || replacement.length >= width) {
    return replacement
  }
  if(flags.indexOf("-", 0) > -1) {
    replacement = replacement + goog.string.repeat(" ", width - replacement.length)
  }else {
    replacement = goog.string.repeat(" ", width - replacement.length) + replacement
  }
  return replacement
};
goog.string.format.demuxes_["f"] = function(value, flags, width, dotp, precision, type, offset, wholeString) {
  var replacement = value.toString();
  if(!(isNaN(precision) || precision == "")) {
    replacement = value.toFixed(precision)
  }
  var sign;
  if(value < 0) {
    sign = "-"
  }else {
    if(flags.indexOf("+") >= 0) {
      sign = "+"
    }else {
      if(flags.indexOf(" ") >= 0) {
        sign = " "
      }else {
        sign = ""
      }
    }
  }
  if(value >= 0) {
    replacement = sign + replacement
  }
  if(isNaN(width) || replacement.length >= width) {
    return replacement
  }
  replacement = isNaN(precision) ? Math.abs(value).toString() : Math.abs(value).toFixed(precision);
  var padCount = width - replacement.length - sign.length;
  if(flags.indexOf("-", 0) >= 0) {
    replacement = sign + replacement + goog.string.repeat(" ", padCount)
  }else {
    var paddingChar = flags.indexOf("0", 0) >= 0 ? "0" : " ";
    replacement = sign + goog.string.repeat(paddingChar, padCount) + replacement
  }
  return replacement
};
goog.string.format.demuxes_["d"] = function(value, flags, width, dotp, precision, type, offset, wholeString) {
  return goog.string.format.demuxes_["f"](parseInt(value, 10), flags, width, dotp, 0, type, offset, wholeString)
};
goog.string.format.demuxes_["i"] = goog.string.format.demuxes_["d"];
goog.string.format.demuxes_["u"] = goog.string.format.demuxes_["d"];
goog.provide("goog.userAgent.jscript");
goog.require("goog.string");
goog.userAgent.jscript.ASSUME_NO_JSCRIPT = false;
goog.userAgent.jscript.init_ = function() {
  var hasScriptEngine = "ScriptEngine" in goog.global;
  goog.userAgent.jscript.DETECTED_HAS_JSCRIPT_ = hasScriptEngine && goog.global["ScriptEngine"]() == "JScript";
  goog.userAgent.jscript.DETECTED_VERSION_ = goog.userAgent.jscript.DETECTED_HAS_JSCRIPT_ ? goog.global["ScriptEngineMajorVersion"]() + "." + goog.global["ScriptEngineMinorVersion"]() + "." + goog.global["ScriptEngineBuildVersion"]() : "0"
};
if(!goog.userAgent.jscript.ASSUME_NO_JSCRIPT) {
  goog.userAgent.jscript.init_()
}
goog.userAgent.jscript.HAS_JSCRIPT = goog.userAgent.jscript.ASSUME_NO_JSCRIPT ? false : goog.userAgent.jscript.DETECTED_HAS_JSCRIPT_;
goog.userAgent.jscript.VERSION = goog.userAgent.jscript.ASSUME_NO_JSCRIPT ? "0" : goog.userAgent.jscript.DETECTED_VERSION_;
goog.userAgent.jscript.isVersion = function(version) {
  return goog.string.compareVersions(goog.userAgent.jscript.VERSION, version) >= 0
};
goog.provide("goog.string.StringBuffer");
goog.require("goog.userAgent.jscript");
goog.string.StringBuffer = function(opt_a1, var_args) {
  this.buffer_ = goog.userAgent.jscript.HAS_JSCRIPT ? [] : "";
  if(opt_a1 != null) {
    this.append.apply(this, arguments)
  }
};
goog.string.StringBuffer.prototype.set = function(s) {
  this.clear();
  this.append(s)
};
if(goog.userAgent.jscript.HAS_JSCRIPT) {
  goog.string.StringBuffer.prototype.bufferLength_ = 0;
  goog.string.StringBuffer.prototype.append = function(a1, opt_a2, var_args) {
    if(opt_a2 == null) {
      this.buffer_[this.bufferLength_++] = a1
    }else {
      this.buffer_.push.apply(this.buffer_, arguments);
      this.bufferLength_ = this.buffer_.length
    }
    return this
  }
}else {
  goog.string.StringBuffer.prototype.append = function(a1, opt_a2, var_args) {
    this.buffer_ += a1;
    if(opt_a2 != null) {
      for(var i = 1;i < arguments.length;i++) {
        this.buffer_ += arguments[i]
      }
    }
    return this
  }
}
goog.string.StringBuffer.prototype.clear = function() {
  if(goog.userAgent.jscript.HAS_JSCRIPT) {
    this.buffer_.length = 0;
    this.bufferLength_ = 0
  }else {
    this.buffer_ = ""
  }
};
goog.string.StringBuffer.prototype.getLength = function() {
  return this.toString().length
};
goog.string.StringBuffer.prototype.toString = function() {
  if(goog.userAgent.jscript.HAS_JSCRIPT) {
    var str = this.buffer_.join("");
    this.clear();
    if(str) {
      this.append(str)
    }
    return str
  }else {
    return this.buffer_
  }
};
goog.provide("cljs.core");
goog.require("goog.array");
goog.require("goog.object");
goog.require("goog.string.format");
goog.require("goog.string.StringBuffer");
goog.require("goog.string");
cljs.core._STAR_unchecked_if_STAR_ = false;
cljs.core._STAR_print_fn_STAR_ = function _STAR_print_fn_STAR_(_) {
  throw new Error("No *print-fn* fn set for evaluation environment");
};
cljs.core.truth_ = function truth_(x) {
  return x != null && x !== false
};
cljs.core.type_satisfies_ = function type_satisfies_(p, x) {
  var x__6221 = x == null ? null : x;
  if(p[goog.typeOf(x__6221)]) {
    return true
  }else {
    if(p["_"]) {
      return true
    }else {
      if("\ufdd0'else") {
        return false
      }else {
        return null
      }
    }
  }
};
cljs.core.is_proto_ = function is_proto_(x) {
  return x.constructor.prototype === x
};
cljs.core._STAR_main_cli_fn_STAR_ = null;
cljs.core.missing_protocol = function missing_protocol(proto, obj) {
  return Error(["No protocol method ", proto, " defined for type ", goog.typeOf(obj), ": ", obj].join(""))
};
cljs.core.aclone = function aclone(array_like) {
  return array_like.slice()
};
cljs.core.array = function array(var_args) {
  return Array.prototype.slice.call(arguments)
};
cljs.core.make_array = function() {
  var make_array = null;
  var make_array__1 = function(size) {
    return new Array(size)
  };
  var make_array__2 = function(type, size) {
    return make_array.call(null, size)
  };
  make_array = function(type, size) {
    switch(arguments.length) {
      case 1:
        return make_array__1.call(this, type);
      case 2:
        return make_array__2.call(this, type, size)
    }
    throw"Invalid arity: " + arguments.length;
  };
  make_array.cljs$lang$arity$1 = make_array__1;
  make_array.cljs$lang$arity$2 = make_array__2;
  return make_array
}();
cljs.core.aget = function() {
  var aget = null;
  var aget__2 = function(array, i) {
    return array[i]
  };
  var aget__3 = function() {
    var G__6222__delegate = function(array, i, idxs) {
      return cljs.core.apply.call(null, aget, aget.call(null, array, i), idxs)
    };
    var G__6222 = function(array, i, var_args) {
      var idxs = null;
      if(goog.isDef(var_args)) {
        idxs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__6222__delegate.call(this, array, i, idxs)
    };
    G__6222.cljs$lang$maxFixedArity = 2;
    G__6222.cljs$lang$applyTo = function(arglist__6223) {
      var array = cljs.core.first(arglist__6223);
      var i = cljs.core.first(cljs.core.next(arglist__6223));
      var idxs = cljs.core.rest(cljs.core.next(arglist__6223));
      return G__6222__delegate(array, i, idxs)
    };
    G__6222.cljs$lang$arity$variadic = G__6222__delegate;
    return G__6222
  }();
  aget = function(array, i, var_args) {
    var idxs = var_args;
    switch(arguments.length) {
      case 2:
        return aget__2.call(this, array, i);
      default:
        return aget__3.cljs$lang$arity$variadic(array, i, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  aget.cljs$lang$maxFixedArity = 2;
  aget.cljs$lang$applyTo = aget__3.cljs$lang$applyTo;
  aget.cljs$lang$arity$2 = aget__2;
  aget.cljs$lang$arity$variadic = aget__3.cljs$lang$arity$variadic;
  return aget
}();
cljs.core.aset = function aset(array, i, val) {
  return array[i] = val
};
cljs.core.alength = function alength(array) {
  return array.length
};
cljs.core.into_array = function() {
  var into_array = null;
  var into_array__1 = function(aseq) {
    return into_array.call(null, null, aseq)
  };
  var into_array__2 = function(type, aseq) {
    return cljs.core.reduce.call(null, function(a, x) {
      a.push(x);
      return a
    }, [], aseq)
  };
  into_array = function(type, aseq) {
    switch(arguments.length) {
      case 1:
        return into_array__1.call(this, type);
      case 2:
        return into_array__2.call(this, type, aseq)
    }
    throw"Invalid arity: " + arguments.length;
  };
  into_array.cljs$lang$arity$1 = into_array__1;
  into_array.cljs$lang$arity$2 = into_array__2;
  return into_array
}();
cljs.core.IFn = {};
cljs.core._invoke = function() {
  var _invoke = null;
  var _invoke__1 = function(this$) {
    if(function() {
      var and__3822__auto____6308 = this$;
      if(and__3822__auto____6308) {
        return this$.cljs$core$IFn$_invoke$arity$1
      }else {
        return and__3822__auto____6308
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$1(this$)
    }else {
      var x__2363__auto____6309 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6310 = cljs.core._invoke[goog.typeOf(x__2363__auto____6309)];
        if(or__3824__auto____6310) {
          return or__3824__auto____6310
        }else {
          var or__3824__auto____6311 = cljs.core._invoke["_"];
          if(or__3824__auto____6311) {
            return or__3824__auto____6311
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$)
    }
  };
  var _invoke__2 = function(this$, a) {
    if(function() {
      var and__3822__auto____6312 = this$;
      if(and__3822__auto____6312) {
        return this$.cljs$core$IFn$_invoke$arity$2
      }else {
        return and__3822__auto____6312
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$2(this$, a)
    }else {
      var x__2363__auto____6313 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6314 = cljs.core._invoke[goog.typeOf(x__2363__auto____6313)];
        if(or__3824__auto____6314) {
          return or__3824__auto____6314
        }else {
          var or__3824__auto____6315 = cljs.core._invoke["_"];
          if(or__3824__auto____6315) {
            return or__3824__auto____6315
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a)
    }
  };
  var _invoke__3 = function(this$, a, b) {
    if(function() {
      var and__3822__auto____6316 = this$;
      if(and__3822__auto____6316) {
        return this$.cljs$core$IFn$_invoke$arity$3
      }else {
        return and__3822__auto____6316
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$3(this$, a, b)
    }else {
      var x__2363__auto____6317 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6318 = cljs.core._invoke[goog.typeOf(x__2363__auto____6317)];
        if(or__3824__auto____6318) {
          return or__3824__auto____6318
        }else {
          var or__3824__auto____6319 = cljs.core._invoke["_"];
          if(or__3824__auto____6319) {
            return or__3824__auto____6319
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b)
    }
  };
  var _invoke__4 = function(this$, a, b, c) {
    if(function() {
      var and__3822__auto____6320 = this$;
      if(and__3822__auto____6320) {
        return this$.cljs$core$IFn$_invoke$arity$4
      }else {
        return and__3822__auto____6320
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$4(this$, a, b, c)
    }else {
      var x__2363__auto____6321 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6322 = cljs.core._invoke[goog.typeOf(x__2363__auto____6321)];
        if(or__3824__auto____6322) {
          return or__3824__auto____6322
        }else {
          var or__3824__auto____6323 = cljs.core._invoke["_"];
          if(or__3824__auto____6323) {
            return or__3824__auto____6323
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c)
    }
  };
  var _invoke__5 = function(this$, a, b, c, d) {
    if(function() {
      var and__3822__auto____6324 = this$;
      if(and__3822__auto____6324) {
        return this$.cljs$core$IFn$_invoke$arity$5
      }else {
        return and__3822__auto____6324
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$5(this$, a, b, c, d)
    }else {
      var x__2363__auto____6325 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6326 = cljs.core._invoke[goog.typeOf(x__2363__auto____6325)];
        if(or__3824__auto____6326) {
          return or__3824__auto____6326
        }else {
          var or__3824__auto____6327 = cljs.core._invoke["_"];
          if(or__3824__auto____6327) {
            return or__3824__auto____6327
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d)
    }
  };
  var _invoke__6 = function(this$, a, b, c, d, e) {
    if(function() {
      var and__3822__auto____6328 = this$;
      if(and__3822__auto____6328) {
        return this$.cljs$core$IFn$_invoke$arity$6
      }else {
        return and__3822__auto____6328
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$6(this$, a, b, c, d, e)
    }else {
      var x__2363__auto____6329 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6330 = cljs.core._invoke[goog.typeOf(x__2363__auto____6329)];
        if(or__3824__auto____6330) {
          return or__3824__auto____6330
        }else {
          var or__3824__auto____6331 = cljs.core._invoke["_"];
          if(or__3824__auto____6331) {
            return or__3824__auto____6331
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e)
    }
  };
  var _invoke__7 = function(this$, a, b, c, d, e, f) {
    if(function() {
      var and__3822__auto____6332 = this$;
      if(and__3822__auto____6332) {
        return this$.cljs$core$IFn$_invoke$arity$7
      }else {
        return and__3822__auto____6332
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$7(this$, a, b, c, d, e, f)
    }else {
      var x__2363__auto____6333 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6334 = cljs.core._invoke[goog.typeOf(x__2363__auto____6333)];
        if(or__3824__auto____6334) {
          return or__3824__auto____6334
        }else {
          var or__3824__auto____6335 = cljs.core._invoke["_"];
          if(or__3824__auto____6335) {
            return or__3824__auto____6335
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f)
    }
  };
  var _invoke__8 = function(this$, a, b, c, d, e, f, g) {
    if(function() {
      var and__3822__auto____6336 = this$;
      if(and__3822__auto____6336) {
        return this$.cljs$core$IFn$_invoke$arity$8
      }else {
        return and__3822__auto____6336
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$8(this$, a, b, c, d, e, f, g)
    }else {
      var x__2363__auto____6337 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6338 = cljs.core._invoke[goog.typeOf(x__2363__auto____6337)];
        if(or__3824__auto____6338) {
          return or__3824__auto____6338
        }else {
          var or__3824__auto____6339 = cljs.core._invoke["_"];
          if(or__3824__auto____6339) {
            return or__3824__auto____6339
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g)
    }
  };
  var _invoke__9 = function(this$, a, b, c, d, e, f, g, h) {
    if(function() {
      var and__3822__auto____6340 = this$;
      if(and__3822__auto____6340) {
        return this$.cljs$core$IFn$_invoke$arity$9
      }else {
        return and__3822__auto____6340
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$9(this$, a, b, c, d, e, f, g, h)
    }else {
      var x__2363__auto____6341 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6342 = cljs.core._invoke[goog.typeOf(x__2363__auto____6341)];
        if(or__3824__auto____6342) {
          return or__3824__auto____6342
        }else {
          var or__3824__auto____6343 = cljs.core._invoke["_"];
          if(or__3824__auto____6343) {
            return or__3824__auto____6343
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h)
    }
  };
  var _invoke__10 = function(this$, a, b, c, d, e, f, g, h, i) {
    if(function() {
      var and__3822__auto____6344 = this$;
      if(and__3822__auto____6344) {
        return this$.cljs$core$IFn$_invoke$arity$10
      }else {
        return and__3822__auto____6344
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$10(this$, a, b, c, d, e, f, g, h, i)
    }else {
      var x__2363__auto____6345 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6346 = cljs.core._invoke[goog.typeOf(x__2363__auto____6345)];
        if(or__3824__auto____6346) {
          return or__3824__auto____6346
        }else {
          var or__3824__auto____6347 = cljs.core._invoke["_"];
          if(or__3824__auto____6347) {
            return or__3824__auto____6347
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i)
    }
  };
  var _invoke__11 = function(this$, a, b, c, d, e, f, g, h, i, j) {
    if(function() {
      var and__3822__auto____6348 = this$;
      if(and__3822__auto____6348) {
        return this$.cljs$core$IFn$_invoke$arity$11
      }else {
        return and__3822__auto____6348
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$11(this$, a, b, c, d, e, f, g, h, i, j)
    }else {
      var x__2363__auto____6349 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6350 = cljs.core._invoke[goog.typeOf(x__2363__auto____6349)];
        if(or__3824__auto____6350) {
          return or__3824__auto____6350
        }else {
          var or__3824__auto____6351 = cljs.core._invoke["_"];
          if(or__3824__auto____6351) {
            return or__3824__auto____6351
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j)
    }
  };
  var _invoke__12 = function(this$, a, b, c, d, e, f, g, h, i, j, k) {
    if(function() {
      var and__3822__auto____6352 = this$;
      if(and__3822__auto____6352) {
        return this$.cljs$core$IFn$_invoke$arity$12
      }else {
        return and__3822__auto____6352
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$12(this$, a, b, c, d, e, f, g, h, i, j, k)
    }else {
      var x__2363__auto____6353 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6354 = cljs.core._invoke[goog.typeOf(x__2363__auto____6353)];
        if(or__3824__auto____6354) {
          return or__3824__auto____6354
        }else {
          var or__3824__auto____6355 = cljs.core._invoke["_"];
          if(or__3824__auto____6355) {
            return or__3824__auto____6355
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k)
    }
  };
  var _invoke__13 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l) {
    if(function() {
      var and__3822__auto____6356 = this$;
      if(and__3822__auto____6356) {
        return this$.cljs$core$IFn$_invoke$arity$13
      }else {
        return and__3822__auto____6356
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$13(this$, a, b, c, d, e, f, g, h, i, j, k, l)
    }else {
      var x__2363__auto____6357 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6358 = cljs.core._invoke[goog.typeOf(x__2363__auto____6357)];
        if(or__3824__auto____6358) {
          return or__3824__auto____6358
        }else {
          var or__3824__auto____6359 = cljs.core._invoke["_"];
          if(or__3824__auto____6359) {
            return or__3824__auto____6359
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l)
    }
  };
  var _invoke__14 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m) {
    if(function() {
      var and__3822__auto____6360 = this$;
      if(and__3822__auto____6360) {
        return this$.cljs$core$IFn$_invoke$arity$14
      }else {
        return and__3822__auto____6360
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$14(this$, a, b, c, d, e, f, g, h, i, j, k, l, m)
    }else {
      var x__2363__auto____6361 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6362 = cljs.core._invoke[goog.typeOf(x__2363__auto____6361)];
        if(or__3824__auto____6362) {
          return or__3824__auto____6362
        }else {
          var or__3824__auto____6363 = cljs.core._invoke["_"];
          if(or__3824__auto____6363) {
            return or__3824__auto____6363
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m)
    }
  };
  var _invoke__15 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n) {
    if(function() {
      var and__3822__auto____6364 = this$;
      if(and__3822__auto____6364) {
        return this$.cljs$core$IFn$_invoke$arity$15
      }else {
        return and__3822__auto____6364
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$15(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n)
    }else {
      var x__2363__auto____6365 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6366 = cljs.core._invoke[goog.typeOf(x__2363__auto____6365)];
        if(or__3824__auto____6366) {
          return or__3824__auto____6366
        }else {
          var or__3824__auto____6367 = cljs.core._invoke["_"];
          if(or__3824__auto____6367) {
            return or__3824__auto____6367
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n)
    }
  };
  var _invoke__16 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o) {
    if(function() {
      var and__3822__auto____6368 = this$;
      if(and__3822__auto____6368) {
        return this$.cljs$core$IFn$_invoke$arity$16
      }else {
        return and__3822__auto____6368
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$16(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o)
    }else {
      var x__2363__auto____6369 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6370 = cljs.core._invoke[goog.typeOf(x__2363__auto____6369)];
        if(or__3824__auto____6370) {
          return or__3824__auto____6370
        }else {
          var or__3824__auto____6371 = cljs.core._invoke["_"];
          if(or__3824__auto____6371) {
            return or__3824__auto____6371
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o)
    }
  };
  var _invoke__17 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p) {
    if(function() {
      var and__3822__auto____6372 = this$;
      if(and__3822__auto____6372) {
        return this$.cljs$core$IFn$_invoke$arity$17
      }else {
        return and__3822__auto____6372
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$17(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p)
    }else {
      var x__2363__auto____6373 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6374 = cljs.core._invoke[goog.typeOf(x__2363__auto____6373)];
        if(or__3824__auto____6374) {
          return or__3824__auto____6374
        }else {
          var or__3824__auto____6375 = cljs.core._invoke["_"];
          if(or__3824__auto____6375) {
            return or__3824__auto____6375
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p)
    }
  };
  var _invoke__18 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q) {
    if(function() {
      var and__3822__auto____6376 = this$;
      if(and__3822__auto____6376) {
        return this$.cljs$core$IFn$_invoke$arity$18
      }else {
        return and__3822__auto____6376
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$18(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q)
    }else {
      var x__2363__auto____6377 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6378 = cljs.core._invoke[goog.typeOf(x__2363__auto____6377)];
        if(or__3824__auto____6378) {
          return or__3824__auto____6378
        }else {
          var or__3824__auto____6379 = cljs.core._invoke["_"];
          if(or__3824__auto____6379) {
            return or__3824__auto____6379
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q)
    }
  };
  var _invoke__19 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s) {
    if(function() {
      var and__3822__auto____6380 = this$;
      if(and__3822__auto____6380) {
        return this$.cljs$core$IFn$_invoke$arity$19
      }else {
        return and__3822__auto____6380
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$19(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s)
    }else {
      var x__2363__auto____6381 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6382 = cljs.core._invoke[goog.typeOf(x__2363__auto____6381)];
        if(or__3824__auto____6382) {
          return or__3824__auto____6382
        }else {
          var or__3824__auto____6383 = cljs.core._invoke["_"];
          if(or__3824__auto____6383) {
            return or__3824__auto____6383
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s)
    }
  };
  var _invoke__20 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t) {
    if(function() {
      var and__3822__auto____6384 = this$;
      if(and__3822__auto____6384) {
        return this$.cljs$core$IFn$_invoke$arity$20
      }else {
        return and__3822__auto____6384
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$20(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t)
    }else {
      var x__2363__auto____6385 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6386 = cljs.core._invoke[goog.typeOf(x__2363__auto____6385)];
        if(or__3824__auto____6386) {
          return or__3824__auto____6386
        }else {
          var or__3824__auto____6387 = cljs.core._invoke["_"];
          if(or__3824__auto____6387) {
            return or__3824__auto____6387
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t)
    }
  };
  var _invoke__21 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest) {
    if(function() {
      var and__3822__auto____6388 = this$;
      if(and__3822__auto____6388) {
        return this$.cljs$core$IFn$_invoke$arity$21
      }else {
        return and__3822__auto____6388
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$21(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest)
    }else {
      var x__2363__auto____6389 = this$ == null ? null : this$;
      return function() {
        var or__3824__auto____6390 = cljs.core._invoke[goog.typeOf(x__2363__auto____6389)];
        if(or__3824__auto____6390) {
          return or__3824__auto____6390
        }else {
          var or__3824__auto____6391 = cljs.core._invoke["_"];
          if(or__3824__auto____6391) {
            return or__3824__auto____6391
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest)
    }
  };
  _invoke = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest) {
    switch(arguments.length) {
      case 1:
        return _invoke__1.call(this, this$);
      case 2:
        return _invoke__2.call(this, this$, a);
      case 3:
        return _invoke__3.call(this, this$, a, b);
      case 4:
        return _invoke__4.call(this, this$, a, b, c);
      case 5:
        return _invoke__5.call(this, this$, a, b, c, d);
      case 6:
        return _invoke__6.call(this, this$, a, b, c, d, e);
      case 7:
        return _invoke__7.call(this, this$, a, b, c, d, e, f);
      case 8:
        return _invoke__8.call(this, this$, a, b, c, d, e, f, g);
      case 9:
        return _invoke__9.call(this, this$, a, b, c, d, e, f, g, h);
      case 10:
        return _invoke__10.call(this, this$, a, b, c, d, e, f, g, h, i);
      case 11:
        return _invoke__11.call(this, this$, a, b, c, d, e, f, g, h, i, j);
      case 12:
        return _invoke__12.call(this, this$, a, b, c, d, e, f, g, h, i, j, k);
      case 13:
        return _invoke__13.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l);
      case 14:
        return _invoke__14.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m);
      case 15:
        return _invoke__15.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n);
      case 16:
        return _invoke__16.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o);
      case 17:
        return _invoke__17.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p);
      case 18:
        return _invoke__18.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q);
      case 19:
        return _invoke__19.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s);
      case 20:
        return _invoke__20.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t);
      case 21:
        return _invoke__21.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _invoke.cljs$lang$arity$1 = _invoke__1;
  _invoke.cljs$lang$arity$2 = _invoke__2;
  _invoke.cljs$lang$arity$3 = _invoke__3;
  _invoke.cljs$lang$arity$4 = _invoke__4;
  _invoke.cljs$lang$arity$5 = _invoke__5;
  _invoke.cljs$lang$arity$6 = _invoke__6;
  _invoke.cljs$lang$arity$7 = _invoke__7;
  _invoke.cljs$lang$arity$8 = _invoke__8;
  _invoke.cljs$lang$arity$9 = _invoke__9;
  _invoke.cljs$lang$arity$10 = _invoke__10;
  _invoke.cljs$lang$arity$11 = _invoke__11;
  _invoke.cljs$lang$arity$12 = _invoke__12;
  _invoke.cljs$lang$arity$13 = _invoke__13;
  _invoke.cljs$lang$arity$14 = _invoke__14;
  _invoke.cljs$lang$arity$15 = _invoke__15;
  _invoke.cljs$lang$arity$16 = _invoke__16;
  _invoke.cljs$lang$arity$17 = _invoke__17;
  _invoke.cljs$lang$arity$18 = _invoke__18;
  _invoke.cljs$lang$arity$19 = _invoke__19;
  _invoke.cljs$lang$arity$20 = _invoke__20;
  _invoke.cljs$lang$arity$21 = _invoke__21;
  return _invoke
}();
cljs.core.ICounted = {};
cljs.core._count = function _count(coll) {
  if(function() {
    var and__3822__auto____6396 = coll;
    if(and__3822__auto____6396) {
      return coll.cljs$core$ICounted$_count$arity$1
    }else {
      return and__3822__auto____6396
    }
  }()) {
    return coll.cljs$core$ICounted$_count$arity$1(coll)
  }else {
    var x__2363__auto____6397 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6398 = cljs.core._count[goog.typeOf(x__2363__auto____6397)];
      if(or__3824__auto____6398) {
        return or__3824__auto____6398
      }else {
        var or__3824__auto____6399 = cljs.core._count["_"];
        if(or__3824__auto____6399) {
          return or__3824__auto____6399
        }else {
          throw cljs.core.missing_protocol.call(null, "ICounted.-count", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.IEmptyableCollection = {};
cljs.core._empty = function _empty(coll) {
  if(function() {
    var and__3822__auto____6404 = coll;
    if(and__3822__auto____6404) {
      return coll.cljs$core$IEmptyableCollection$_empty$arity$1
    }else {
      return and__3822__auto____6404
    }
  }()) {
    return coll.cljs$core$IEmptyableCollection$_empty$arity$1(coll)
  }else {
    var x__2363__auto____6405 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6406 = cljs.core._empty[goog.typeOf(x__2363__auto____6405)];
      if(or__3824__auto____6406) {
        return or__3824__auto____6406
      }else {
        var or__3824__auto____6407 = cljs.core._empty["_"];
        if(or__3824__auto____6407) {
          return or__3824__auto____6407
        }else {
          throw cljs.core.missing_protocol.call(null, "IEmptyableCollection.-empty", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.ICollection = {};
cljs.core._conj = function _conj(coll, o) {
  if(function() {
    var and__3822__auto____6412 = coll;
    if(and__3822__auto____6412) {
      return coll.cljs$core$ICollection$_conj$arity$2
    }else {
      return and__3822__auto____6412
    }
  }()) {
    return coll.cljs$core$ICollection$_conj$arity$2(coll, o)
  }else {
    var x__2363__auto____6413 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6414 = cljs.core._conj[goog.typeOf(x__2363__auto____6413)];
      if(or__3824__auto____6414) {
        return or__3824__auto____6414
      }else {
        var or__3824__auto____6415 = cljs.core._conj["_"];
        if(or__3824__auto____6415) {
          return or__3824__auto____6415
        }else {
          throw cljs.core.missing_protocol.call(null, "ICollection.-conj", coll);
        }
      }
    }().call(null, coll, o)
  }
};
cljs.core.IIndexed = {};
cljs.core._nth = function() {
  var _nth = null;
  var _nth__2 = function(coll, n) {
    if(function() {
      var and__3822__auto____6424 = coll;
      if(and__3822__auto____6424) {
        return coll.cljs$core$IIndexed$_nth$arity$2
      }else {
        return and__3822__auto____6424
      }
    }()) {
      return coll.cljs$core$IIndexed$_nth$arity$2(coll, n)
    }else {
      var x__2363__auto____6425 = coll == null ? null : coll;
      return function() {
        var or__3824__auto____6426 = cljs.core._nth[goog.typeOf(x__2363__auto____6425)];
        if(or__3824__auto____6426) {
          return or__3824__auto____6426
        }else {
          var or__3824__auto____6427 = cljs.core._nth["_"];
          if(or__3824__auto____6427) {
            return or__3824__auto____6427
          }else {
            throw cljs.core.missing_protocol.call(null, "IIndexed.-nth", coll);
          }
        }
      }().call(null, coll, n)
    }
  };
  var _nth__3 = function(coll, n, not_found) {
    if(function() {
      var and__3822__auto____6428 = coll;
      if(and__3822__auto____6428) {
        return coll.cljs$core$IIndexed$_nth$arity$3
      }else {
        return and__3822__auto____6428
      }
    }()) {
      return coll.cljs$core$IIndexed$_nth$arity$3(coll, n, not_found)
    }else {
      var x__2363__auto____6429 = coll == null ? null : coll;
      return function() {
        var or__3824__auto____6430 = cljs.core._nth[goog.typeOf(x__2363__auto____6429)];
        if(or__3824__auto____6430) {
          return or__3824__auto____6430
        }else {
          var or__3824__auto____6431 = cljs.core._nth["_"];
          if(or__3824__auto____6431) {
            return or__3824__auto____6431
          }else {
            throw cljs.core.missing_protocol.call(null, "IIndexed.-nth", coll);
          }
        }
      }().call(null, coll, n, not_found)
    }
  };
  _nth = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return _nth__2.call(this, coll, n);
      case 3:
        return _nth__3.call(this, coll, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _nth.cljs$lang$arity$2 = _nth__2;
  _nth.cljs$lang$arity$3 = _nth__3;
  return _nth
}();
cljs.core.ASeq = {};
cljs.core.ISeq = {};
cljs.core._first = function _first(coll) {
  if(function() {
    var and__3822__auto____6436 = coll;
    if(and__3822__auto____6436) {
      return coll.cljs$core$ISeq$_first$arity$1
    }else {
      return and__3822__auto____6436
    }
  }()) {
    return coll.cljs$core$ISeq$_first$arity$1(coll)
  }else {
    var x__2363__auto____6437 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6438 = cljs.core._first[goog.typeOf(x__2363__auto____6437)];
      if(or__3824__auto____6438) {
        return or__3824__auto____6438
      }else {
        var or__3824__auto____6439 = cljs.core._first["_"];
        if(or__3824__auto____6439) {
          return or__3824__auto____6439
        }else {
          throw cljs.core.missing_protocol.call(null, "ISeq.-first", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core._rest = function _rest(coll) {
  if(function() {
    var and__3822__auto____6444 = coll;
    if(and__3822__auto____6444) {
      return coll.cljs$core$ISeq$_rest$arity$1
    }else {
      return and__3822__auto____6444
    }
  }()) {
    return coll.cljs$core$ISeq$_rest$arity$1(coll)
  }else {
    var x__2363__auto____6445 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6446 = cljs.core._rest[goog.typeOf(x__2363__auto____6445)];
      if(or__3824__auto____6446) {
        return or__3824__auto____6446
      }else {
        var or__3824__auto____6447 = cljs.core._rest["_"];
        if(or__3824__auto____6447) {
          return or__3824__auto____6447
        }else {
          throw cljs.core.missing_protocol.call(null, "ISeq.-rest", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.INext = {};
cljs.core._next = function _next(coll) {
  if(function() {
    var and__3822__auto____6452 = coll;
    if(and__3822__auto____6452) {
      return coll.cljs$core$INext$_next$arity$1
    }else {
      return and__3822__auto____6452
    }
  }()) {
    return coll.cljs$core$INext$_next$arity$1(coll)
  }else {
    var x__2363__auto____6453 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6454 = cljs.core._next[goog.typeOf(x__2363__auto____6453)];
      if(or__3824__auto____6454) {
        return or__3824__auto____6454
      }else {
        var or__3824__auto____6455 = cljs.core._next["_"];
        if(or__3824__auto____6455) {
          return or__3824__auto____6455
        }else {
          throw cljs.core.missing_protocol.call(null, "INext.-next", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.ILookup = {};
cljs.core._lookup = function() {
  var _lookup = null;
  var _lookup__2 = function(o, k) {
    if(function() {
      var and__3822__auto____6464 = o;
      if(and__3822__auto____6464) {
        return o.cljs$core$ILookup$_lookup$arity$2
      }else {
        return and__3822__auto____6464
      }
    }()) {
      return o.cljs$core$ILookup$_lookup$arity$2(o, k)
    }else {
      var x__2363__auto____6465 = o == null ? null : o;
      return function() {
        var or__3824__auto____6466 = cljs.core._lookup[goog.typeOf(x__2363__auto____6465)];
        if(or__3824__auto____6466) {
          return or__3824__auto____6466
        }else {
          var or__3824__auto____6467 = cljs.core._lookup["_"];
          if(or__3824__auto____6467) {
            return or__3824__auto____6467
          }else {
            throw cljs.core.missing_protocol.call(null, "ILookup.-lookup", o);
          }
        }
      }().call(null, o, k)
    }
  };
  var _lookup__3 = function(o, k, not_found) {
    if(function() {
      var and__3822__auto____6468 = o;
      if(and__3822__auto____6468) {
        return o.cljs$core$ILookup$_lookup$arity$3
      }else {
        return and__3822__auto____6468
      }
    }()) {
      return o.cljs$core$ILookup$_lookup$arity$3(o, k, not_found)
    }else {
      var x__2363__auto____6469 = o == null ? null : o;
      return function() {
        var or__3824__auto____6470 = cljs.core._lookup[goog.typeOf(x__2363__auto____6469)];
        if(or__3824__auto____6470) {
          return or__3824__auto____6470
        }else {
          var or__3824__auto____6471 = cljs.core._lookup["_"];
          if(or__3824__auto____6471) {
            return or__3824__auto____6471
          }else {
            throw cljs.core.missing_protocol.call(null, "ILookup.-lookup", o);
          }
        }
      }().call(null, o, k, not_found)
    }
  };
  _lookup = function(o, k, not_found) {
    switch(arguments.length) {
      case 2:
        return _lookup__2.call(this, o, k);
      case 3:
        return _lookup__3.call(this, o, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _lookup.cljs$lang$arity$2 = _lookup__2;
  _lookup.cljs$lang$arity$3 = _lookup__3;
  return _lookup
}();
cljs.core.IAssociative = {};
cljs.core._contains_key_QMARK_ = function _contains_key_QMARK_(coll, k) {
  if(function() {
    var and__3822__auto____6476 = coll;
    if(and__3822__auto____6476) {
      return coll.cljs$core$IAssociative$_contains_key_QMARK_$arity$2
    }else {
      return and__3822__auto____6476
    }
  }()) {
    return coll.cljs$core$IAssociative$_contains_key_QMARK_$arity$2(coll, k)
  }else {
    var x__2363__auto____6477 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6478 = cljs.core._contains_key_QMARK_[goog.typeOf(x__2363__auto____6477)];
      if(or__3824__auto____6478) {
        return or__3824__auto____6478
      }else {
        var or__3824__auto____6479 = cljs.core._contains_key_QMARK_["_"];
        if(or__3824__auto____6479) {
          return or__3824__auto____6479
        }else {
          throw cljs.core.missing_protocol.call(null, "IAssociative.-contains-key?", coll);
        }
      }
    }().call(null, coll, k)
  }
};
cljs.core._assoc = function _assoc(coll, k, v) {
  if(function() {
    var and__3822__auto____6484 = coll;
    if(and__3822__auto____6484) {
      return coll.cljs$core$IAssociative$_assoc$arity$3
    }else {
      return and__3822__auto____6484
    }
  }()) {
    return coll.cljs$core$IAssociative$_assoc$arity$3(coll, k, v)
  }else {
    var x__2363__auto____6485 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6486 = cljs.core._assoc[goog.typeOf(x__2363__auto____6485)];
      if(or__3824__auto____6486) {
        return or__3824__auto____6486
      }else {
        var or__3824__auto____6487 = cljs.core._assoc["_"];
        if(or__3824__auto____6487) {
          return or__3824__auto____6487
        }else {
          throw cljs.core.missing_protocol.call(null, "IAssociative.-assoc", coll);
        }
      }
    }().call(null, coll, k, v)
  }
};
cljs.core.IMap = {};
cljs.core._dissoc = function _dissoc(coll, k) {
  if(function() {
    var and__3822__auto____6492 = coll;
    if(and__3822__auto____6492) {
      return coll.cljs$core$IMap$_dissoc$arity$2
    }else {
      return and__3822__auto____6492
    }
  }()) {
    return coll.cljs$core$IMap$_dissoc$arity$2(coll, k)
  }else {
    var x__2363__auto____6493 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6494 = cljs.core._dissoc[goog.typeOf(x__2363__auto____6493)];
      if(or__3824__auto____6494) {
        return or__3824__auto____6494
      }else {
        var or__3824__auto____6495 = cljs.core._dissoc["_"];
        if(or__3824__auto____6495) {
          return or__3824__auto____6495
        }else {
          throw cljs.core.missing_protocol.call(null, "IMap.-dissoc", coll);
        }
      }
    }().call(null, coll, k)
  }
};
cljs.core.IMapEntry = {};
cljs.core._key = function _key(coll) {
  if(function() {
    var and__3822__auto____6500 = coll;
    if(and__3822__auto____6500) {
      return coll.cljs$core$IMapEntry$_key$arity$1
    }else {
      return and__3822__auto____6500
    }
  }()) {
    return coll.cljs$core$IMapEntry$_key$arity$1(coll)
  }else {
    var x__2363__auto____6501 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6502 = cljs.core._key[goog.typeOf(x__2363__auto____6501)];
      if(or__3824__auto____6502) {
        return or__3824__auto____6502
      }else {
        var or__3824__auto____6503 = cljs.core._key["_"];
        if(or__3824__auto____6503) {
          return or__3824__auto____6503
        }else {
          throw cljs.core.missing_protocol.call(null, "IMapEntry.-key", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core._val = function _val(coll) {
  if(function() {
    var and__3822__auto____6508 = coll;
    if(and__3822__auto____6508) {
      return coll.cljs$core$IMapEntry$_val$arity$1
    }else {
      return and__3822__auto____6508
    }
  }()) {
    return coll.cljs$core$IMapEntry$_val$arity$1(coll)
  }else {
    var x__2363__auto____6509 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6510 = cljs.core._val[goog.typeOf(x__2363__auto____6509)];
      if(or__3824__auto____6510) {
        return or__3824__auto____6510
      }else {
        var or__3824__auto____6511 = cljs.core._val["_"];
        if(or__3824__auto____6511) {
          return or__3824__auto____6511
        }else {
          throw cljs.core.missing_protocol.call(null, "IMapEntry.-val", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.ISet = {};
cljs.core._disjoin = function _disjoin(coll, v) {
  if(function() {
    var and__3822__auto____6516 = coll;
    if(and__3822__auto____6516) {
      return coll.cljs$core$ISet$_disjoin$arity$2
    }else {
      return and__3822__auto____6516
    }
  }()) {
    return coll.cljs$core$ISet$_disjoin$arity$2(coll, v)
  }else {
    var x__2363__auto____6517 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6518 = cljs.core._disjoin[goog.typeOf(x__2363__auto____6517)];
      if(or__3824__auto____6518) {
        return or__3824__auto____6518
      }else {
        var or__3824__auto____6519 = cljs.core._disjoin["_"];
        if(or__3824__auto____6519) {
          return or__3824__auto____6519
        }else {
          throw cljs.core.missing_protocol.call(null, "ISet.-disjoin", coll);
        }
      }
    }().call(null, coll, v)
  }
};
cljs.core.IStack = {};
cljs.core._peek = function _peek(coll) {
  if(function() {
    var and__3822__auto____6524 = coll;
    if(and__3822__auto____6524) {
      return coll.cljs$core$IStack$_peek$arity$1
    }else {
      return and__3822__auto____6524
    }
  }()) {
    return coll.cljs$core$IStack$_peek$arity$1(coll)
  }else {
    var x__2363__auto____6525 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6526 = cljs.core._peek[goog.typeOf(x__2363__auto____6525)];
      if(or__3824__auto____6526) {
        return or__3824__auto____6526
      }else {
        var or__3824__auto____6527 = cljs.core._peek["_"];
        if(or__3824__auto____6527) {
          return or__3824__auto____6527
        }else {
          throw cljs.core.missing_protocol.call(null, "IStack.-peek", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core._pop = function _pop(coll) {
  if(function() {
    var and__3822__auto____6532 = coll;
    if(and__3822__auto____6532) {
      return coll.cljs$core$IStack$_pop$arity$1
    }else {
      return and__3822__auto____6532
    }
  }()) {
    return coll.cljs$core$IStack$_pop$arity$1(coll)
  }else {
    var x__2363__auto____6533 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6534 = cljs.core._pop[goog.typeOf(x__2363__auto____6533)];
      if(or__3824__auto____6534) {
        return or__3824__auto____6534
      }else {
        var or__3824__auto____6535 = cljs.core._pop["_"];
        if(or__3824__auto____6535) {
          return or__3824__auto____6535
        }else {
          throw cljs.core.missing_protocol.call(null, "IStack.-pop", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.IVector = {};
cljs.core._assoc_n = function _assoc_n(coll, n, val) {
  if(function() {
    var and__3822__auto____6540 = coll;
    if(and__3822__auto____6540) {
      return coll.cljs$core$IVector$_assoc_n$arity$3
    }else {
      return and__3822__auto____6540
    }
  }()) {
    return coll.cljs$core$IVector$_assoc_n$arity$3(coll, n, val)
  }else {
    var x__2363__auto____6541 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6542 = cljs.core._assoc_n[goog.typeOf(x__2363__auto____6541)];
      if(or__3824__auto____6542) {
        return or__3824__auto____6542
      }else {
        var or__3824__auto____6543 = cljs.core._assoc_n["_"];
        if(or__3824__auto____6543) {
          return or__3824__auto____6543
        }else {
          throw cljs.core.missing_protocol.call(null, "IVector.-assoc-n", coll);
        }
      }
    }().call(null, coll, n, val)
  }
};
cljs.core.IDeref = {};
cljs.core._deref = function _deref(o) {
  if(function() {
    var and__3822__auto____6548 = o;
    if(and__3822__auto____6548) {
      return o.cljs$core$IDeref$_deref$arity$1
    }else {
      return and__3822__auto____6548
    }
  }()) {
    return o.cljs$core$IDeref$_deref$arity$1(o)
  }else {
    var x__2363__auto____6549 = o == null ? null : o;
    return function() {
      var or__3824__auto____6550 = cljs.core._deref[goog.typeOf(x__2363__auto____6549)];
      if(or__3824__auto____6550) {
        return or__3824__auto____6550
      }else {
        var or__3824__auto____6551 = cljs.core._deref["_"];
        if(or__3824__auto____6551) {
          return or__3824__auto____6551
        }else {
          throw cljs.core.missing_protocol.call(null, "IDeref.-deref", o);
        }
      }
    }().call(null, o)
  }
};
cljs.core.IDerefWithTimeout = {};
cljs.core._deref_with_timeout = function _deref_with_timeout(o, msec, timeout_val) {
  if(function() {
    var and__3822__auto____6556 = o;
    if(and__3822__auto____6556) {
      return o.cljs$core$IDerefWithTimeout$_deref_with_timeout$arity$3
    }else {
      return and__3822__auto____6556
    }
  }()) {
    return o.cljs$core$IDerefWithTimeout$_deref_with_timeout$arity$3(o, msec, timeout_val)
  }else {
    var x__2363__auto____6557 = o == null ? null : o;
    return function() {
      var or__3824__auto____6558 = cljs.core._deref_with_timeout[goog.typeOf(x__2363__auto____6557)];
      if(or__3824__auto____6558) {
        return or__3824__auto____6558
      }else {
        var or__3824__auto____6559 = cljs.core._deref_with_timeout["_"];
        if(or__3824__auto____6559) {
          return or__3824__auto____6559
        }else {
          throw cljs.core.missing_protocol.call(null, "IDerefWithTimeout.-deref-with-timeout", o);
        }
      }
    }().call(null, o, msec, timeout_val)
  }
};
cljs.core.IMeta = {};
cljs.core._meta = function _meta(o) {
  if(function() {
    var and__3822__auto____6564 = o;
    if(and__3822__auto____6564) {
      return o.cljs$core$IMeta$_meta$arity$1
    }else {
      return and__3822__auto____6564
    }
  }()) {
    return o.cljs$core$IMeta$_meta$arity$1(o)
  }else {
    var x__2363__auto____6565 = o == null ? null : o;
    return function() {
      var or__3824__auto____6566 = cljs.core._meta[goog.typeOf(x__2363__auto____6565)];
      if(or__3824__auto____6566) {
        return or__3824__auto____6566
      }else {
        var or__3824__auto____6567 = cljs.core._meta["_"];
        if(or__3824__auto____6567) {
          return or__3824__auto____6567
        }else {
          throw cljs.core.missing_protocol.call(null, "IMeta.-meta", o);
        }
      }
    }().call(null, o)
  }
};
cljs.core.IWithMeta = {};
cljs.core._with_meta = function _with_meta(o, meta) {
  if(function() {
    var and__3822__auto____6572 = o;
    if(and__3822__auto____6572) {
      return o.cljs$core$IWithMeta$_with_meta$arity$2
    }else {
      return and__3822__auto____6572
    }
  }()) {
    return o.cljs$core$IWithMeta$_with_meta$arity$2(o, meta)
  }else {
    var x__2363__auto____6573 = o == null ? null : o;
    return function() {
      var or__3824__auto____6574 = cljs.core._with_meta[goog.typeOf(x__2363__auto____6573)];
      if(or__3824__auto____6574) {
        return or__3824__auto____6574
      }else {
        var or__3824__auto____6575 = cljs.core._with_meta["_"];
        if(or__3824__auto____6575) {
          return or__3824__auto____6575
        }else {
          throw cljs.core.missing_protocol.call(null, "IWithMeta.-with-meta", o);
        }
      }
    }().call(null, o, meta)
  }
};
cljs.core.IReduce = {};
cljs.core._reduce = function() {
  var _reduce = null;
  var _reduce__2 = function(coll, f) {
    if(function() {
      var and__3822__auto____6584 = coll;
      if(and__3822__auto____6584) {
        return coll.cljs$core$IReduce$_reduce$arity$2
      }else {
        return and__3822__auto____6584
      }
    }()) {
      return coll.cljs$core$IReduce$_reduce$arity$2(coll, f)
    }else {
      var x__2363__auto____6585 = coll == null ? null : coll;
      return function() {
        var or__3824__auto____6586 = cljs.core._reduce[goog.typeOf(x__2363__auto____6585)];
        if(or__3824__auto____6586) {
          return or__3824__auto____6586
        }else {
          var or__3824__auto____6587 = cljs.core._reduce["_"];
          if(or__3824__auto____6587) {
            return or__3824__auto____6587
          }else {
            throw cljs.core.missing_protocol.call(null, "IReduce.-reduce", coll);
          }
        }
      }().call(null, coll, f)
    }
  };
  var _reduce__3 = function(coll, f, start) {
    if(function() {
      var and__3822__auto____6588 = coll;
      if(and__3822__auto____6588) {
        return coll.cljs$core$IReduce$_reduce$arity$3
      }else {
        return and__3822__auto____6588
      }
    }()) {
      return coll.cljs$core$IReduce$_reduce$arity$3(coll, f, start)
    }else {
      var x__2363__auto____6589 = coll == null ? null : coll;
      return function() {
        var or__3824__auto____6590 = cljs.core._reduce[goog.typeOf(x__2363__auto____6589)];
        if(or__3824__auto____6590) {
          return or__3824__auto____6590
        }else {
          var or__3824__auto____6591 = cljs.core._reduce["_"];
          if(or__3824__auto____6591) {
            return or__3824__auto____6591
          }else {
            throw cljs.core.missing_protocol.call(null, "IReduce.-reduce", coll);
          }
        }
      }().call(null, coll, f, start)
    }
  };
  _reduce = function(coll, f, start) {
    switch(arguments.length) {
      case 2:
        return _reduce__2.call(this, coll, f);
      case 3:
        return _reduce__3.call(this, coll, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _reduce.cljs$lang$arity$2 = _reduce__2;
  _reduce.cljs$lang$arity$3 = _reduce__3;
  return _reduce
}();
cljs.core.IKVReduce = {};
cljs.core._kv_reduce = function _kv_reduce(coll, f, init) {
  if(function() {
    var and__3822__auto____6596 = coll;
    if(and__3822__auto____6596) {
      return coll.cljs$core$IKVReduce$_kv_reduce$arity$3
    }else {
      return and__3822__auto____6596
    }
  }()) {
    return coll.cljs$core$IKVReduce$_kv_reduce$arity$3(coll, f, init)
  }else {
    var x__2363__auto____6597 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6598 = cljs.core._kv_reduce[goog.typeOf(x__2363__auto____6597)];
      if(or__3824__auto____6598) {
        return or__3824__auto____6598
      }else {
        var or__3824__auto____6599 = cljs.core._kv_reduce["_"];
        if(or__3824__auto____6599) {
          return or__3824__auto____6599
        }else {
          throw cljs.core.missing_protocol.call(null, "IKVReduce.-kv-reduce", coll);
        }
      }
    }().call(null, coll, f, init)
  }
};
cljs.core.IEquiv = {};
cljs.core._equiv = function _equiv(o, other) {
  if(function() {
    var and__3822__auto____6604 = o;
    if(and__3822__auto____6604) {
      return o.cljs$core$IEquiv$_equiv$arity$2
    }else {
      return and__3822__auto____6604
    }
  }()) {
    return o.cljs$core$IEquiv$_equiv$arity$2(o, other)
  }else {
    var x__2363__auto____6605 = o == null ? null : o;
    return function() {
      var or__3824__auto____6606 = cljs.core._equiv[goog.typeOf(x__2363__auto____6605)];
      if(or__3824__auto____6606) {
        return or__3824__auto____6606
      }else {
        var or__3824__auto____6607 = cljs.core._equiv["_"];
        if(or__3824__auto____6607) {
          return or__3824__auto____6607
        }else {
          throw cljs.core.missing_protocol.call(null, "IEquiv.-equiv", o);
        }
      }
    }().call(null, o, other)
  }
};
cljs.core.IHash = {};
cljs.core._hash = function _hash(o) {
  if(function() {
    var and__3822__auto____6612 = o;
    if(and__3822__auto____6612) {
      return o.cljs$core$IHash$_hash$arity$1
    }else {
      return and__3822__auto____6612
    }
  }()) {
    return o.cljs$core$IHash$_hash$arity$1(o)
  }else {
    var x__2363__auto____6613 = o == null ? null : o;
    return function() {
      var or__3824__auto____6614 = cljs.core._hash[goog.typeOf(x__2363__auto____6613)];
      if(or__3824__auto____6614) {
        return or__3824__auto____6614
      }else {
        var or__3824__auto____6615 = cljs.core._hash["_"];
        if(or__3824__auto____6615) {
          return or__3824__auto____6615
        }else {
          throw cljs.core.missing_protocol.call(null, "IHash.-hash", o);
        }
      }
    }().call(null, o)
  }
};
cljs.core.ISeqable = {};
cljs.core._seq = function _seq(o) {
  if(function() {
    var and__3822__auto____6620 = o;
    if(and__3822__auto____6620) {
      return o.cljs$core$ISeqable$_seq$arity$1
    }else {
      return and__3822__auto____6620
    }
  }()) {
    return o.cljs$core$ISeqable$_seq$arity$1(o)
  }else {
    var x__2363__auto____6621 = o == null ? null : o;
    return function() {
      var or__3824__auto____6622 = cljs.core._seq[goog.typeOf(x__2363__auto____6621)];
      if(or__3824__auto____6622) {
        return or__3824__auto____6622
      }else {
        var or__3824__auto____6623 = cljs.core._seq["_"];
        if(or__3824__auto____6623) {
          return or__3824__auto____6623
        }else {
          throw cljs.core.missing_protocol.call(null, "ISeqable.-seq", o);
        }
      }
    }().call(null, o)
  }
};
cljs.core.ISequential = {};
cljs.core.IList = {};
cljs.core.IRecord = {};
cljs.core.IReversible = {};
cljs.core._rseq = function _rseq(coll) {
  if(function() {
    var and__3822__auto____6628 = coll;
    if(and__3822__auto____6628) {
      return coll.cljs$core$IReversible$_rseq$arity$1
    }else {
      return and__3822__auto____6628
    }
  }()) {
    return coll.cljs$core$IReversible$_rseq$arity$1(coll)
  }else {
    var x__2363__auto____6629 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6630 = cljs.core._rseq[goog.typeOf(x__2363__auto____6629)];
      if(or__3824__auto____6630) {
        return or__3824__auto____6630
      }else {
        var or__3824__auto____6631 = cljs.core._rseq["_"];
        if(or__3824__auto____6631) {
          return or__3824__auto____6631
        }else {
          throw cljs.core.missing_protocol.call(null, "IReversible.-rseq", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.ISorted = {};
cljs.core._sorted_seq = function _sorted_seq(coll, ascending_QMARK_) {
  if(function() {
    var and__3822__auto____6636 = coll;
    if(and__3822__auto____6636) {
      return coll.cljs$core$ISorted$_sorted_seq$arity$2
    }else {
      return and__3822__auto____6636
    }
  }()) {
    return coll.cljs$core$ISorted$_sorted_seq$arity$2(coll, ascending_QMARK_)
  }else {
    var x__2363__auto____6637 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6638 = cljs.core._sorted_seq[goog.typeOf(x__2363__auto____6637)];
      if(or__3824__auto____6638) {
        return or__3824__auto____6638
      }else {
        var or__3824__auto____6639 = cljs.core._sorted_seq["_"];
        if(or__3824__auto____6639) {
          return or__3824__auto____6639
        }else {
          throw cljs.core.missing_protocol.call(null, "ISorted.-sorted-seq", coll);
        }
      }
    }().call(null, coll, ascending_QMARK_)
  }
};
cljs.core._sorted_seq_from = function _sorted_seq_from(coll, k, ascending_QMARK_) {
  if(function() {
    var and__3822__auto____6644 = coll;
    if(and__3822__auto____6644) {
      return coll.cljs$core$ISorted$_sorted_seq_from$arity$3
    }else {
      return and__3822__auto____6644
    }
  }()) {
    return coll.cljs$core$ISorted$_sorted_seq_from$arity$3(coll, k, ascending_QMARK_)
  }else {
    var x__2363__auto____6645 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6646 = cljs.core._sorted_seq_from[goog.typeOf(x__2363__auto____6645)];
      if(or__3824__auto____6646) {
        return or__3824__auto____6646
      }else {
        var or__3824__auto____6647 = cljs.core._sorted_seq_from["_"];
        if(or__3824__auto____6647) {
          return or__3824__auto____6647
        }else {
          throw cljs.core.missing_protocol.call(null, "ISorted.-sorted-seq-from", coll);
        }
      }
    }().call(null, coll, k, ascending_QMARK_)
  }
};
cljs.core._entry_key = function _entry_key(coll, entry) {
  if(function() {
    var and__3822__auto____6652 = coll;
    if(and__3822__auto____6652) {
      return coll.cljs$core$ISorted$_entry_key$arity$2
    }else {
      return and__3822__auto____6652
    }
  }()) {
    return coll.cljs$core$ISorted$_entry_key$arity$2(coll, entry)
  }else {
    var x__2363__auto____6653 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6654 = cljs.core._entry_key[goog.typeOf(x__2363__auto____6653)];
      if(or__3824__auto____6654) {
        return or__3824__auto____6654
      }else {
        var or__3824__auto____6655 = cljs.core._entry_key["_"];
        if(or__3824__auto____6655) {
          return or__3824__auto____6655
        }else {
          throw cljs.core.missing_protocol.call(null, "ISorted.-entry-key", coll);
        }
      }
    }().call(null, coll, entry)
  }
};
cljs.core._comparator = function _comparator(coll) {
  if(function() {
    var and__3822__auto____6660 = coll;
    if(and__3822__auto____6660) {
      return coll.cljs$core$ISorted$_comparator$arity$1
    }else {
      return and__3822__auto____6660
    }
  }()) {
    return coll.cljs$core$ISorted$_comparator$arity$1(coll)
  }else {
    var x__2363__auto____6661 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6662 = cljs.core._comparator[goog.typeOf(x__2363__auto____6661)];
      if(or__3824__auto____6662) {
        return or__3824__auto____6662
      }else {
        var or__3824__auto____6663 = cljs.core._comparator["_"];
        if(or__3824__auto____6663) {
          return or__3824__auto____6663
        }else {
          throw cljs.core.missing_protocol.call(null, "ISorted.-comparator", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.IPrintable = {};
cljs.core._pr_seq = function _pr_seq(o, opts) {
  if(function() {
    var and__3822__auto____6668 = o;
    if(and__3822__auto____6668) {
      return o.cljs$core$IPrintable$_pr_seq$arity$2
    }else {
      return and__3822__auto____6668
    }
  }()) {
    return o.cljs$core$IPrintable$_pr_seq$arity$2(o, opts)
  }else {
    var x__2363__auto____6669 = o == null ? null : o;
    return function() {
      var or__3824__auto____6670 = cljs.core._pr_seq[goog.typeOf(x__2363__auto____6669)];
      if(or__3824__auto____6670) {
        return or__3824__auto____6670
      }else {
        var or__3824__auto____6671 = cljs.core._pr_seq["_"];
        if(or__3824__auto____6671) {
          return or__3824__auto____6671
        }else {
          throw cljs.core.missing_protocol.call(null, "IPrintable.-pr-seq", o);
        }
      }
    }().call(null, o, opts)
  }
};
cljs.core.IPending = {};
cljs.core._realized_QMARK_ = function _realized_QMARK_(d) {
  if(function() {
    var and__3822__auto____6676 = d;
    if(and__3822__auto____6676) {
      return d.cljs$core$IPending$_realized_QMARK_$arity$1
    }else {
      return and__3822__auto____6676
    }
  }()) {
    return d.cljs$core$IPending$_realized_QMARK_$arity$1(d)
  }else {
    var x__2363__auto____6677 = d == null ? null : d;
    return function() {
      var or__3824__auto____6678 = cljs.core._realized_QMARK_[goog.typeOf(x__2363__auto____6677)];
      if(or__3824__auto____6678) {
        return or__3824__auto____6678
      }else {
        var or__3824__auto____6679 = cljs.core._realized_QMARK_["_"];
        if(or__3824__auto____6679) {
          return or__3824__auto____6679
        }else {
          throw cljs.core.missing_protocol.call(null, "IPending.-realized?", d);
        }
      }
    }().call(null, d)
  }
};
cljs.core.IWatchable = {};
cljs.core._notify_watches = function _notify_watches(this$, oldval, newval) {
  if(function() {
    var and__3822__auto____6684 = this$;
    if(and__3822__auto____6684) {
      return this$.cljs$core$IWatchable$_notify_watches$arity$3
    }else {
      return and__3822__auto____6684
    }
  }()) {
    return this$.cljs$core$IWatchable$_notify_watches$arity$3(this$, oldval, newval)
  }else {
    var x__2363__auto____6685 = this$ == null ? null : this$;
    return function() {
      var or__3824__auto____6686 = cljs.core._notify_watches[goog.typeOf(x__2363__auto____6685)];
      if(or__3824__auto____6686) {
        return or__3824__auto____6686
      }else {
        var or__3824__auto____6687 = cljs.core._notify_watches["_"];
        if(or__3824__auto____6687) {
          return or__3824__auto____6687
        }else {
          throw cljs.core.missing_protocol.call(null, "IWatchable.-notify-watches", this$);
        }
      }
    }().call(null, this$, oldval, newval)
  }
};
cljs.core._add_watch = function _add_watch(this$, key, f) {
  if(function() {
    var and__3822__auto____6692 = this$;
    if(and__3822__auto____6692) {
      return this$.cljs$core$IWatchable$_add_watch$arity$3
    }else {
      return and__3822__auto____6692
    }
  }()) {
    return this$.cljs$core$IWatchable$_add_watch$arity$3(this$, key, f)
  }else {
    var x__2363__auto____6693 = this$ == null ? null : this$;
    return function() {
      var or__3824__auto____6694 = cljs.core._add_watch[goog.typeOf(x__2363__auto____6693)];
      if(or__3824__auto____6694) {
        return or__3824__auto____6694
      }else {
        var or__3824__auto____6695 = cljs.core._add_watch["_"];
        if(or__3824__auto____6695) {
          return or__3824__auto____6695
        }else {
          throw cljs.core.missing_protocol.call(null, "IWatchable.-add-watch", this$);
        }
      }
    }().call(null, this$, key, f)
  }
};
cljs.core._remove_watch = function _remove_watch(this$, key) {
  if(function() {
    var and__3822__auto____6700 = this$;
    if(and__3822__auto____6700) {
      return this$.cljs$core$IWatchable$_remove_watch$arity$2
    }else {
      return and__3822__auto____6700
    }
  }()) {
    return this$.cljs$core$IWatchable$_remove_watch$arity$2(this$, key)
  }else {
    var x__2363__auto____6701 = this$ == null ? null : this$;
    return function() {
      var or__3824__auto____6702 = cljs.core._remove_watch[goog.typeOf(x__2363__auto____6701)];
      if(or__3824__auto____6702) {
        return or__3824__auto____6702
      }else {
        var or__3824__auto____6703 = cljs.core._remove_watch["_"];
        if(or__3824__auto____6703) {
          return or__3824__auto____6703
        }else {
          throw cljs.core.missing_protocol.call(null, "IWatchable.-remove-watch", this$);
        }
      }
    }().call(null, this$, key)
  }
};
cljs.core.IEditableCollection = {};
cljs.core._as_transient = function _as_transient(coll) {
  if(function() {
    var and__3822__auto____6708 = coll;
    if(and__3822__auto____6708) {
      return coll.cljs$core$IEditableCollection$_as_transient$arity$1
    }else {
      return and__3822__auto____6708
    }
  }()) {
    return coll.cljs$core$IEditableCollection$_as_transient$arity$1(coll)
  }else {
    var x__2363__auto____6709 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6710 = cljs.core._as_transient[goog.typeOf(x__2363__auto____6709)];
      if(or__3824__auto____6710) {
        return or__3824__auto____6710
      }else {
        var or__3824__auto____6711 = cljs.core._as_transient["_"];
        if(or__3824__auto____6711) {
          return or__3824__auto____6711
        }else {
          throw cljs.core.missing_protocol.call(null, "IEditableCollection.-as-transient", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.ITransientCollection = {};
cljs.core._conj_BANG_ = function _conj_BANG_(tcoll, val) {
  if(function() {
    var and__3822__auto____6716 = tcoll;
    if(and__3822__auto____6716) {
      return tcoll.cljs$core$ITransientCollection$_conj_BANG_$arity$2
    }else {
      return and__3822__auto____6716
    }
  }()) {
    return tcoll.cljs$core$ITransientCollection$_conj_BANG_$arity$2(tcoll, val)
  }else {
    var x__2363__auto____6717 = tcoll == null ? null : tcoll;
    return function() {
      var or__3824__auto____6718 = cljs.core._conj_BANG_[goog.typeOf(x__2363__auto____6717)];
      if(or__3824__auto____6718) {
        return or__3824__auto____6718
      }else {
        var or__3824__auto____6719 = cljs.core._conj_BANG_["_"];
        if(or__3824__auto____6719) {
          return or__3824__auto____6719
        }else {
          throw cljs.core.missing_protocol.call(null, "ITransientCollection.-conj!", tcoll);
        }
      }
    }().call(null, tcoll, val)
  }
};
cljs.core._persistent_BANG_ = function _persistent_BANG_(tcoll) {
  if(function() {
    var and__3822__auto____6724 = tcoll;
    if(and__3822__auto____6724) {
      return tcoll.cljs$core$ITransientCollection$_persistent_BANG_$arity$1
    }else {
      return and__3822__auto____6724
    }
  }()) {
    return tcoll.cljs$core$ITransientCollection$_persistent_BANG_$arity$1(tcoll)
  }else {
    var x__2363__auto____6725 = tcoll == null ? null : tcoll;
    return function() {
      var or__3824__auto____6726 = cljs.core._persistent_BANG_[goog.typeOf(x__2363__auto____6725)];
      if(or__3824__auto____6726) {
        return or__3824__auto____6726
      }else {
        var or__3824__auto____6727 = cljs.core._persistent_BANG_["_"];
        if(or__3824__auto____6727) {
          return or__3824__auto____6727
        }else {
          throw cljs.core.missing_protocol.call(null, "ITransientCollection.-persistent!", tcoll);
        }
      }
    }().call(null, tcoll)
  }
};
cljs.core.ITransientAssociative = {};
cljs.core._assoc_BANG_ = function _assoc_BANG_(tcoll, key, val) {
  if(function() {
    var and__3822__auto____6732 = tcoll;
    if(and__3822__auto____6732) {
      return tcoll.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3
    }else {
      return and__3822__auto____6732
    }
  }()) {
    return tcoll.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3(tcoll, key, val)
  }else {
    var x__2363__auto____6733 = tcoll == null ? null : tcoll;
    return function() {
      var or__3824__auto____6734 = cljs.core._assoc_BANG_[goog.typeOf(x__2363__auto____6733)];
      if(or__3824__auto____6734) {
        return or__3824__auto____6734
      }else {
        var or__3824__auto____6735 = cljs.core._assoc_BANG_["_"];
        if(or__3824__auto____6735) {
          return or__3824__auto____6735
        }else {
          throw cljs.core.missing_protocol.call(null, "ITransientAssociative.-assoc!", tcoll);
        }
      }
    }().call(null, tcoll, key, val)
  }
};
cljs.core.ITransientMap = {};
cljs.core._dissoc_BANG_ = function _dissoc_BANG_(tcoll, key) {
  if(function() {
    var and__3822__auto____6740 = tcoll;
    if(and__3822__auto____6740) {
      return tcoll.cljs$core$ITransientMap$_dissoc_BANG_$arity$2
    }else {
      return and__3822__auto____6740
    }
  }()) {
    return tcoll.cljs$core$ITransientMap$_dissoc_BANG_$arity$2(tcoll, key)
  }else {
    var x__2363__auto____6741 = tcoll == null ? null : tcoll;
    return function() {
      var or__3824__auto____6742 = cljs.core._dissoc_BANG_[goog.typeOf(x__2363__auto____6741)];
      if(or__3824__auto____6742) {
        return or__3824__auto____6742
      }else {
        var or__3824__auto____6743 = cljs.core._dissoc_BANG_["_"];
        if(or__3824__auto____6743) {
          return or__3824__auto____6743
        }else {
          throw cljs.core.missing_protocol.call(null, "ITransientMap.-dissoc!", tcoll);
        }
      }
    }().call(null, tcoll, key)
  }
};
cljs.core.ITransientVector = {};
cljs.core._assoc_n_BANG_ = function _assoc_n_BANG_(tcoll, n, val) {
  if(function() {
    var and__3822__auto____6748 = tcoll;
    if(and__3822__auto____6748) {
      return tcoll.cljs$core$ITransientVector$_assoc_n_BANG_$arity$3
    }else {
      return and__3822__auto____6748
    }
  }()) {
    return tcoll.cljs$core$ITransientVector$_assoc_n_BANG_$arity$3(tcoll, n, val)
  }else {
    var x__2363__auto____6749 = tcoll == null ? null : tcoll;
    return function() {
      var or__3824__auto____6750 = cljs.core._assoc_n_BANG_[goog.typeOf(x__2363__auto____6749)];
      if(or__3824__auto____6750) {
        return or__3824__auto____6750
      }else {
        var or__3824__auto____6751 = cljs.core._assoc_n_BANG_["_"];
        if(or__3824__auto____6751) {
          return or__3824__auto____6751
        }else {
          throw cljs.core.missing_protocol.call(null, "ITransientVector.-assoc-n!", tcoll);
        }
      }
    }().call(null, tcoll, n, val)
  }
};
cljs.core._pop_BANG_ = function _pop_BANG_(tcoll) {
  if(function() {
    var and__3822__auto____6756 = tcoll;
    if(and__3822__auto____6756) {
      return tcoll.cljs$core$ITransientVector$_pop_BANG_$arity$1
    }else {
      return and__3822__auto____6756
    }
  }()) {
    return tcoll.cljs$core$ITransientVector$_pop_BANG_$arity$1(tcoll)
  }else {
    var x__2363__auto____6757 = tcoll == null ? null : tcoll;
    return function() {
      var or__3824__auto____6758 = cljs.core._pop_BANG_[goog.typeOf(x__2363__auto____6757)];
      if(or__3824__auto____6758) {
        return or__3824__auto____6758
      }else {
        var or__3824__auto____6759 = cljs.core._pop_BANG_["_"];
        if(or__3824__auto____6759) {
          return or__3824__auto____6759
        }else {
          throw cljs.core.missing_protocol.call(null, "ITransientVector.-pop!", tcoll);
        }
      }
    }().call(null, tcoll)
  }
};
cljs.core.ITransientSet = {};
cljs.core._disjoin_BANG_ = function _disjoin_BANG_(tcoll, v) {
  if(function() {
    var and__3822__auto____6764 = tcoll;
    if(and__3822__auto____6764) {
      return tcoll.cljs$core$ITransientSet$_disjoin_BANG_$arity$2
    }else {
      return and__3822__auto____6764
    }
  }()) {
    return tcoll.cljs$core$ITransientSet$_disjoin_BANG_$arity$2(tcoll, v)
  }else {
    var x__2363__auto____6765 = tcoll == null ? null : tcoll;
    return function() {
      var or__3824__auto____6766 = cljs.core._disjoin_BANG_[goog.typeOf(x__2363__auto____6765)];
      if(or__3824__auto____6766) {
        return or__3824__auto____6766
      }else {
        var or__3824__auto____6767 = cljs.core._disjoin_BANG_["_"];
        if(or__3824__auto____6767) {
          return or__3824__auto____6767
        }else {
          throw cljs.core.missing_protocol.call(null, "ITransientSet.-disjoin!", tcoll);
        }
      }
    }().call(null, tcoll, v)
  }
};
cljs.core.IComparable = {};
cljs.core._compare = function _compare(x, y) {
  if(function() {
    var and__3822__auto____6772 = x;
    if(and__3822__auto____6772) {
      return x.cljs$core$IComparable$_compare$arity$2
    }else {
      return and__3822__auto____6772
    }
  }()) {
    return x.cljs$core$IComparable$_compare$arity$2(x, y)
  }else {
    var x__2363__auto____6773 = x == null ? null : x;
    return function() {
      var or__3824__auto____6774 = cljs.core._compare[goog.typeOf(x__2363__auto____6773)];
      if(or__3824__auto____6774) {
        return or__3824__auto____6774
      }else {
        var or__3824__auto____6775 = cljs.core._compare["_"];
        if(or__3824__auto____6775) {
          return or__3824__auto____6775
        }else {
          throw cljs.core.missing_protocol.call(null, "IComparable.-compare", x);
        }
      }
    }().call(null, x, y)
  }
};
cljs.core.IChunk = {};
cljs.core._drop_first = function _drop_first(coll) {
  if(function() {
    var and__3822__auto____6780 = coll;
    if(and__3822__auto____6780) {
      return coll.cljs$core$IChunk$_drop_first$arity$1
    }else {
      return and__3822__auto____6780
    }
  }()) {
    return coll.cljs$core$IChunk$_drop_first$arity$1(coll)
  }else {
    var x__2363__auto____6781 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6782 = cljs.core._drop_first[goog.typeOf(x__2363__auto____6781)];
      if(or__3824__auto____6782) {
        return or__3824__auto____6782
      }else {
        var or__3824__auto____6783 = cljs.core._drop_first["_"];
        if(or__3824__auto____6783) {
          return or__3824__auto____6783
        }else {
          throw cljs.core.missing_protocol.call(null, "IChunk.-drop-first", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.IChunkedSeq = {};
cljs.core._chunked_first = function _chunked_first(coll) {
  if(function() {
    var and__3822__auto____6788 = coll;
    if(and__3822__auto____6788) {
      return coll.cljs$core$IChunkedSeq$_chunked_first$arity$1
    }else {
      return and__3822__auto____6788
    }
  }()) {
    return coll.cljs$core$IChunkedSeq$_chunked_first$arity$1(coll)
  }else {
    var x__2363__auto____6789 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6790 = cljs.core._chunked_first[goog.typeOf(x__2363__auto____6789)];
      if(or__3824__auto____6790) {
        return or__3824__auto____6790
      }else {
        var or__3824__auto____6791 = cljs.core._chunked_first["_"];
        if(or__3824__auto____6791) {
          return or__3824__auto____6791
        }else {
          throw cljs.core.missing_protocol.call(null, "IChunkedSeq.-chunked-first", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core._chunked_rest = function _chunked_rest(coll) {
  if(function() {
    var and__3822__auto____6796 = coll;
    if(and__3822__auto____6796) {
      return coll.cljs$core$IChunkedSeq$_chunked_rest$arity$1
    }else {
      return and__3822__auto____6796
    }
  }()) {
    return coll.cljs$core$IChunkedSeq$_chunked_rest$arity$1(coll)
  }else {
    var x__2363__auto____6797 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6798 = cljs.core._chunked_rest[goog.typeOf(x__2363__auto____6797)];
      if(or__3824__auto____6798) {
        return or__3824__auto____6798
      }else {
        var or__3824__auto____6799 = cljs.core._chunked_rest["_"];
        if(or__3824__auto____6799) {
          return or__3824__auto____6799
        }else {
          throw cljs.core.missing_protocol.call(null, "IChunkedSeq.-chunked-rest", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.IChunkedNext = {};
cljs.core._chunked_next = function _chunked_next(coll) {
  if(function() {
    var and__3822__auto____6804 = coll;
    if(and__3822__auto____6804) {
      return coll.cljs$core$IChunkedNext$_chunked_next$arity$1
    }else {
      return and__3822__auto____6804
    }
  }()) {
    return coll.cljs$core$IChunkedNext$_chunked_next$arity$1(coll)
  }else {
    var x__2363__auto____6805 = coll == null ? null : coll;
    return function() {
      var or__3824__auto____6806 = cljs.core._chunked_next[goog.typeOf(x__2363__auto____6805)];
      if(or__3824__auto____6806) {
        return or__3824__auto____6806
      }else {
        var or__3824__auto____6807 = cljs.core._chunked_next["_"];
        if(or__3824__auto____6807) {
          return or__3824__auto____6807
        }else {
          throw cljs.core.missing_protocol.call(null, "IChunkedNext.-chunked-next", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.identical_QMARK_ = function identical_QMARK_(x, y) {
  return x === y
};
cljs.core._EQ_ = function() {
  var _EQ_ = null;
  var _EQ___1 = function(x) {
    return true
  };
  var _EQ___2 = function(x, y) {
    var or__3824__auto____6809 = x === y;
    if(or__3824__auto____6809) {
      return or__3824__auto____6809
    }else {
      return cljs.core._equiv.call(null, x, y)
    }
  };
  var _EQ___3 = function() {
    var G__6810__delegate = function(x, y, more) {
      while(true) {
        if(cljs.core.truth_(_EQ_.call(null, x, y))) {
          if(cljs.core.next.call(null, more)) {
            var G__6811 = y;
            var G__6812 = cljs.core.first.call(null, more);
            var G__6813 = cljs.core.next.call(null, more);
            x = G__6811;
            y = G__6812;
            more = G__6813;
            continue
          }else {
            return _EQ_.call(null, y, cljs.core.first.call(null, more))
          }
        }else {
          return false
        }
        break
      }
    };
    var G__6810 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__6810__delegate.call(this, x, y, more)
    };
    G__6810.cljs$lang$maxFixedArity = 2;
    G__6810.cljs$lang$applyTo = function(arglist__6814) {
      var x = cljs.core.first(arglist__6814);
      var y = cljs.core.first(cljs.core.next(arglist__6814));
      var more = cljs.core.rest(cljs.core.next(arglist__6814));
      return G__6810__delegate(x, y, more)
    };
    G__6810.cljs$lang$arity$variadic = G__6810__delegate;
    return G__6810
  }();
  _EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _EQ___1.call(this, x);
      case 2:
        return _EQ___2.call(this, x, y);
      default:
        return _EQ___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _EQ_.cljs$lang$maxFixedArity = 2;
  _EQ_.cljs$lang$applyTo = _EQ___3.cljs$lang$applyTo;
  _EQ_.cljs$lang$arity$1 = _EQ___1;
  _EQ_.cljs$lang$arity$2 = _EQ___2;
  _EQ_.cljs$lang$arity$variadic = _EQ___3.cljs$lang$arity$variadic;
  return _EQ_
}();
cljs.core.nil_QMARK_ = function nil_QMARK_(x) {
  return x == null
};
cljs.core.type = function type(x) {
  if(x == null) {
    return null
  }else {
    return x.constructor
  }
};
cljs.core.instance_QMARK_ = function instance_QMARK_(t, o) {
  return o instanceof t
};
cljs.core.IHash["null"] = true;
cljs.core._hash["null"] = function(o) {
  return 0
};
cljs.core.ILookup["null"] = true;
cljs.core._lookup["null"] = function() {
  var G__6815 = null;
  var G__6815__2 = function(o, k) {
    return null
  };
  var G__6815__3 = function(o, k, not_found) {
    return not_found
  };
  G__6815 = function(o, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__6815__2.call(this, o, k);
      case 3:
        return G__6815__3.call(this, o, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__6815
}();
cljs.core.IAssociative["null"] = true;
cljs.core._assoc["null"] = function(_, k, v) {
  return cljs.core.hash_map.call(null, k, v)
};
cljs.core.INext["null"] = true;
cljs.core._next["null"] = function(_) {
  return null
};
cljs.core.ICollection["null"] = true;
cljs.core._conj["null"] = function(_, o) {
  return cljs.core.list.call(null, o)
};
cljs.core.IReduce["null"] = true;
cljs.core._reduce["null"] = function() {
  var G__6816 = null;
  var G__6816__2 = function(_, f) {
    return f.call(null)
  };
  var G__6816__3 = function(_, f, start) {
    return start
  };
  G__6816 = function(_, f, start) {
    switch(arguments.length) {
      case 2:
        return G__6816__2.call(this, _, f);
      case 3:
        return G__6816__3.call(this, _, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__6816
}();
cljs.core.IPrintable["null"] = true;
cljs.core._pr_seq["null"] = function(o) {
  return cljs.core.list.call(null, "nil")
};
cljs.core.ISet["null"] = true;
cljs.core._disjoin["null"] = function(_, v) {
  return null
};
cljs.core.ICounted["null"] = true;
cljs.core._count["null"] = function(_) {
  return 0
};
cljs.core.IStack["null"] = true;
cljs.core._peek["null"] = function(_) {
  return null
};
cljs.core._pop["null"] = function(_) {
  return null
};
cljs.core.ISeq["null"] = true;
cljs.core._first["null"] = function(_) {
  return null
};
cljs.core._rest["null"] = function(_) {
  return cljs.core.list.call(null)
};
cljs.core.IEquiv["null"] = true;
cljs.core._equiv["null"] = function(_, o) {
  return o == null
};
cljs.core.IWithMeta["null"] = true;
cljs.core._with_meta["null"] = function(_, meta) {
  return null
};
cljs.core.IMeta["null"] = true;
cljs.core._meta["null"] = function(_) {
  return null
};
cljs.core.IIndexed["null"] = true;
cljs.core._nth["null"] = function() {
  var G__6817 = null;
  var G__6817__2 = function(_, n) {
    return null
  };
  var G__6817__3 = function(_, n, not_found) {
    return not_found
  };
  G__6817 = function(_, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__6817__2.call(this, _, n);
      case 3:
        return G__6817__3.call(this, _, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__6817
}();
cljs.core.IEmptyableCollection["null"] = true;
cljs.core._empty["null"] = function(_) {
  return null
};
cljs.core.IMap["null"] = true;
cljs.core._dissoc["null"] = function(_, k) {
  return null
};
Date.prototype.cljs$core$IEquiv$ = true;
Date.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(o, other) {
  var and__3822__auto____6818 = cljs.core.instance_QMARK_.call(null, Date, other);
  if(and__3822__auto____6818) {
    return o.toString() === other.toString()
  }else {
    return and__3822__auto____6818
  }
};
cljs.core.IHash["number"] = true;
cljs.core._hash["number"] = function(o) {
  return o
};
cljs.core.IEquiv["number"] = true;
cljs.core._equiv["number"] = function(x, o) {
  return x === o
};
cljs.core.IHash["boolean"] = true;
cljs.core._hash["boolean"] = function(o) {
  if(o === true) {
    return 1
  }else {
    return 0
  }
};
cljs.core.IHash["_"] = true;
cljs.core._hash["_"] = function(o) {
  return goog.getUid(o)
};
cljs.core.inc = function inc(x) {
  return x + 1
};
cljs.core.ci_reduce = function() {
  var ci_reduce = null;
  var ci_reduce__2 = function(cicoll, f) {
    var cnt__6831 = cljs.core._count.call(null, cicoll);
    if(cnt__6831 === 0) {
      return f.call(null)
    }else {
      var val__6832 = cljs.core._nth.call(null, cicoll, 0);
      var n__6833 = 1;
      while(true) {
        if(n__6833 < cnt__6831) {
          var nval__6834 = f.call(null, val__6832, cljs.core._nth.call(null, cicoll, n__6833));
          if(cljs.core.reduced_QMARK_.call(null, nval__6834)) {
            return cljs.core.deref.call(null, nval__6834)
          }else {
            var G__6843 = nval__6834;
            var G__6844 = n__6833 + 1;
            val__6832 = G__6843;
            n__6833 = G__6844;
            continue
          }
        }else {
          return val__6832
        }
        break
      }
    }
  };
  var ci_reduce__3 = function(cicoll, f, val) {
    var cnt__6835 = cljs.core._count.call(null, cicoll);
    var val__6836 = val;
    var n__6837 = 0;
    while(true) {
      if(n__6837 < cnt__6835) {
        var nval__6838 = f.call(null, val__6836, cljs.core._nth.call(null, cicoll, n__6837));
        if(cljs.core.reduced_QMARK_.call(null, nval__6838)) {
          return cljs.core.deref.call(null, nval__6838)
        }else {
          var G__6845 = nval__6838;
          var G__6846 = n__6837 + 1;
          val__6836 = G__6845;
          n__6837 = G__6846;
          continue
        }
      }else {
        return val__6836
      }
      break
    }
  };
  var ci_reduce__4 = function(cicoll, f, val, idx) {
    var cnt__6839 = cljs.core._count.call(null, cicoll);
    var val__6840 = val;
    var n__6841 = idx;
    while(true) {
      if(n__6841 < cnt__6839) {
        var nval__6842 = f.call(null, val__6840, cljs.core._nth.call(null, cicoll, n__6841));
        if(cljs.core.reduced_QMARK_.call(null, nval__6842)) {
          return cljs.core.deref.call(null, nval__6842)
        }else {
          var G__6847 = nval__6842;
          var G__6848 = n__6841 + 1;
          val__6840 = G__6847;
          n__6841 = G__6848;
          continue
        }
      }else {
        return val__6840
      }
      break
    }
  };
  ci_reduce = function(cicoll, f, val, idx) {
    switch(arguments.length) {
      case 2:
        return ci_reduce__2.call(this, cicoll, f);
      case 3:
        return ci_reduce__3.call(this, cicoll, f, val);
      case 4:
        return ci_reduce__4.call(this, cicoll, f, val, idx)
    }
    throw"Invalid arity: " + arguments.length;
  };
  ci_reduce.cljs$lang$arity$2 = ci_reduce__2;
  ci_reduce.cljs$lang$arity$3 = ci_reduce__3;
  ci_reduce.cljs$lang$arity$4 = ci_reduce__4;
  return ci_reduce
}();
cljs.core.array_reduce = function() {
  var array_reduce = null;
  var array_reduce__2 = function(arr, f) {
    var cnt__6861 = arr.length;
    if(arr.length === 0) {
      return f.call(null)
    }else {
      var val__6862 = arr[0];
      var n__6863 = 1;
      while(true) {
        if(n__6863 < cnt__6861) {
          var nval__6864 = f.call(null, val__6862, arr[n__6863]);
          if(cljs.core.reduced_QMARK_.call(null, nval__6864)) {
            return cljs.core.deref.call(null, nval__6864)
          }else {
            var G__6873 = nval__6864;
            var G__6874 = n__6863 + 1;
            val__6862 = G__6873;
            n__6863 = G__6874;
            continue
          }
        }else {
          return val__6862
        }
        break
      }
    }
  };
  var array_reduce__3 = function(arr, f, val) {
    var cnt__6865 = arr.length;
    var val__6866 = val;
    var n__6867 = 0;
    while(true) {
      if(n__6867 < cnt__6865) {
        var nval__6868 = f.call(null, val__6866, arr[n__6867]);
        if(cljs.core.reduced_QMARK_.call(null, nval__6868)) {
          return cljs.core.deref.call(null, nval__6868)
        }else {
          var G__6875 = nval__6868;
          var G__6876 = n__6867 + 1;
          val__6866 = G__6875;
          n__6867 = G__6876;
          continue
        }
      }else {
        return val__6866
      }
      break
    }
  };
  var array_reduce__4 = function(arr, f, val, idx) {
    var cnt__6869 = arr.length;
    var val__6870 = val;
    var n__6871 = idx;
    while(true) {
      if(n__6871 < cnt__6869) {
        var nval__6872 = f.call(null, val__6870, arr[n__6871]);
        if(cljs.core.reduced_QMARK_.call(null, nval__6872)) {
          return cljs.core.deref.call(null, nval__6872)
        }else {
          var G__6877 = nval__6872;
          var G__6878 = n__6871 + 1;
          val__6870 = G__6877;
          n__6871 = G__6878;
          continue
        }
      }else {
        return val__6870
      }
      break
    }
  };
  array_reduce = function(arr, f, val, idx) {
    switch(arguments.length) {
      case 2:
        return array_reduce__2.call(this, arr, f);
      case 3:
        return array_reduce__3.call(this, arr, f, val);
      case 4:
        return array_reduce__4.call(this, arr, f, val, idx)
    }
    throw"Invalid arity: " + arguments.length;
  };
  array_reduce.cljs$lang$arity$2 = array_reduce__2;
  array_reduce.cljs$lang$arity$3 = array_reduce__3;
  array_reduce.cljs$lang$arity$4 = array_reduce__4;
  return array_reduce
}();
cljs.core.IndexedSeq = function(a, i) {
  this.a = a;
  this.i = i;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 166199546
};
cljs.core.IndexedSeq.cljs$lang$type = true;
cljs.core.IndexedSeq.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/IndexedSeq")
};
cljs.core.IndexedSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__6879 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.IndexedSeq.prototype.cljs$core$INext$_next$arity$1 = function(_) {
  var this__6880 = this;
  if(this__6880.i + 1 < this__6880.a.length) {
    return new cljs.core.IndexedSeq(this__6880.a, this__6880.i + 1)
  }else {
    return null
  }
};
cljs.core.IndexedSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__6881 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.IndexedSeq.prototype.cljs$core$IReversible$_rseq$arity$1 = function(coll) {
  var this__6882 = this;
  var c__6883 = coll.cljs$core$ICounted$_count$arity$1(coll);
  if(c__6883 > 0) {
    return new cljs.core.RSeq(coll, c__6883 - 1, null)
  }else {
    return cljs.core.List.EMPTY
  }
};
cljs.core.IndexedSeq.prototype.toString = function() {
  var this__6884 = this;
  var this__6885 = this;
  return cljs.core.pr_str.call(null, this__6885)
};
cljs.core.IndexedSeq.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var this__6886 = this;
  if(cljs.core.counted_QMARK_.call(null, this__6886.a)) {
    return cljs.core.ci_reduce.call(null, this__6886.a, f, this__6886.a[this__6886.i], this__6886.i + 1)
  }else {
    return cljs.core.ci_reduce.call(null, coll, f, this__6886.a[this__6886.i], 0)
  }
};
cljs.core.IndexedSeq.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var this__6887 = this;
  if(cljs.core.counted_QMARK_.call(null, this__6887.a)) {
    return cljs.core.ci_reduce.call(null, this__6887.a, f, start, this__6887.i)
  }else {
    return cljs.core.ci_reduce.call(null, coll, f, start, 0)
  }
};
cljs.core.IndexedSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(this$) {
  var this__6888 = this;
  return this$
};
cljs.core.IndexedSeq.prototype.cljs$core$ICounted$_count$arity$1 = function(_) {
  var this__6889 = this;
  return this__6889.a.length - this__6889.i
};
cljs.core.IndexedSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(_) {
  var this__6890 = this;
  return this__6890.a[this__6890.i]
};
cljs.core.IndexedSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(_) {
  var this__6891 = this;
  if(this__6891.i + 1 < this__6891.a.length) {
    return new cljs.core.IndexedSeq(this__6891.a, this__6891.i + 1)
  }else {
    return cljs.core.list.call(null)
  }
};
cljs.core.IndexedSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__6892 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.IndexedSeq.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, n) {
  var this__6893 = this;
  var i__6894 = n + this__6893.i;
  if(i__6894 < this__6893.a.length) {
    return this__6893.a[i__6894]
  }else {
    return null
  }
};
cljs.core.IndexedSeq.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, n, not_found) {
  var this__6895 = this;
  var i__6896 = n + this__6895.i;
  if(i__6896 < this__6895.a.length) {
    return this__6895.a[i__6896]
  }else {
    return not_found
  }
};
cljs.core.IndexedSeq;
cljs.core.prim_seq = function() {
  var prim_seq = null;
  var prim_seq__1 = function(prim) {
    return prim_seq.call(null, prim, 0)
  };
  var prim_seq__2 = function(prim, i) {
    if(prim.length === 0) {
      return null
    }else {
      return new cljs.core.IndexedSeq(prim, i)
    }
  };
  prim_seq = function(prim, i) {
    switch(arguments.length) {
      case 1:
        return prim_seq__1.call(this, prim);
      case 2:
        return prim_seq__2.call(this, prim, i)
    }
    throw"Invalid arity: " + arguments.length;
  };
  prim_seq.cljs$lang$arity$1 = prim_seq__1;
  prim_seq.cljs$lang$arity$2 = prim_seq__2;
  return prim_seq
}();
cljs.core.array_seq = function() {
  var array_seq = null;
  var array_seq__1 = function(array) {
    return cljs.core.prim_seq.call(null, array, 0)
  };
  var array_seq__2 = function(array, i) {
    return cljs.core.prim_seq.call(null, array, i)
  };
  array_seq = function(array, i) {
    switch(arguments.length) {
      case 1:
        return array_seq__1.call(this, array);
      case 2:
        return array_seq__2.call(this, array, i)
    }
    throw"Invalid arity: " + arguments.length;
  };
  array_seq.cljs$lang$arity$1 = array_seq__1;
  array_seq.cljs$lang$arity$2 = array_seq__2;
  return array_seq
}();
cljs.core.IReduce["array"] = true;
cljs.core._reduce["array"] = function() {
  var G__6897 = null;
  var G__6897__2 = function(array, f) {
    return cljs.core.ci_reduce.call(null, array, f)
  };
  var G__6897__3 = function(array, f, start) {
    return cljs.core.ci_reduce.call(null, array, f, start)
  };
  G__6897 = function(array, f, start) {
    switch(arguments.length) {
      case 2:
        return G__6897__2.call(this, array, f);
      case 3:
        return G__6897__3.call(this, array, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__6897
}();
cljs.core.ILookup["array"] = true;
cljs.core._lookup["array"] = function() {
  var G__6898 = null;
  var G__6898__2 = function(array, k) {
    return array[k]
  };
  var G__6898__3 = function(array, k, not_found) {
    return cljs.core._nth.call(null, array, k, not_found)
  };
  G__6898 = function(array, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__6898__2.call(this, array, k);
      case 3:
        return G__6898__3.call(this, array, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__6898
}();
cljs.core.IIndexed["array"] = true;
cljs.core._nth["array"] = function() {
  var G__6899 = null;
  var G__6899__2 = function(array, n) {
    if(n < array.length) {
      return array[n]
    }else {
      return null
    }
  };
  var G__6899__3 = function(array, n, not_found) {
    if(n < array.length) {
      return array[n]
    }else {
      return not_found
    }
  };
  G__6899 = function(array, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__6899__2.call(this, array, n);
      case 3:
        return G__6899__3.call(this, array, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__6899
}();
cljs.core.ICounted["array"] = true;
cljs.core._count["array"] = function(a) {
  return a.length
};
cljs.core.ISeqable["array"] = true;
cljs.core._seq["array"] = function(array) {
  return cljs.core.array_seq.call(null, array, 0)
};
cljs.core.RSeq = function(ci, i, meta) {
  this.ci = ci;
  this.i = i;
  this.meta = meta;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 31850570
};
cljs.core.RSeq.cljs$lang$type = true;
cljs.core.RSeq.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/RSeq")
};
cljs.core.RSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__6900 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.RSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__6901 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.RSeq.prototype.toString = function() {
  var this__6902 = this;
  var this__6903 = this;
  return cljs.core.pr_str.call(null, this__6903)
};
cljs.core.RSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__6904 = this;
  return coll
};
cljs.core.RSeq.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__6905 = this;
  return this__6905.i + 1
};
cljs.core.RSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__6906 = this;
  return cljs.core._nth.call(null, this__6906.ci, this__6906.i)
};
cljs.core.RSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__6907 = this;
  if(this__6907.i > 0) {
    return new cljs.core.RSeq(this__6907.ci, this__6907.i - 1, null)
  }else {
    return cljs.core.List.EMPTY
  }
};
cljs.core.RSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__6908 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.RSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, new_meta) {
  var this__6909 = this;
  return new cljs.core.RSeq(this__6909.ci, this__6909.i, new_meta)
};
cljs.core.RSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__6910 = this;
  return this__6910.meta
};
cljs.core.RSeq;
cljs.core.seq = function seq(coll) {
  if(coll == null) {
    return null
  }else {
    if(function() {
      var G__6914__6915 = coll;
      if(G__6914__6915) {
        if(function() {
          var or__3824__auto____6916 = G__6914__6915.cljs$lang$protocol_mask$partition0$ & 32;
          if(or__3824__auto____6916) {
            return or__3824__auto____6916
          }else {
            return G__6914__6915.cljs$core$ASeq$
          }
        }()) {
          return true
        }else {
          if(!G__6914__6915.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.type_satisfies_.call(null, cljs.core.ASeq, G__6914__6915)
          }else {
            return false
          }
        }
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.ASeq, G__6914__6915)
      }
    }()) {
      return coll
    }else {
      return cljs.core._seq.call(null, coll)
    }
  }
};
cljs.core.first = function first(coll) {
  if(coll == null) {
    return null
  }else {
    if(function() {
      var G__6921__6922 = coll;
      if(G__6921__6922) {
        if(function() {
          var or__3824__auto____6923 = G__6921__6922.cljs$lang$protocol_mask$partition0$ & 64;
          if(or__3824__auto____6923) {
            return or__3824__auto____6923
          }else {
            return G__6921__6922.cljs$core$ISeq$
          }
        }()) {
          return true
        }else {
          if(!G__6921__6922.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.type_satisfies_.call(null, cljs.core.ISeq, G__6921__6922)
          }else {
            return false
          }
        }
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.ISeq, G__6921__6922)
      }
    }()) {
      return cljs.core._first.call(null, coll)
    }else {
      var s__6924 = cljs.core.seq.call(null, coll);
      if(s__6924 == null) {
        return null
      }else {
        return cljs.core._first.call(null, s__6924)
      }
    }
  }
};
cljs.core.rest = function rest(coll) {
  if(!(coll == null)) {
    if(function() {
      var G__6929__6930 = coll;
      if(G__6929__6930) {
        if(function() {
          var or__3824__auto____6931 = G__6929__6930.cljs$lang$protocol_mask$partition0$ & 64;
          if(or__3824__auto____6931) {
            return or__3824__auto____6931
          }else {
            return G__6929__6930.cljs$core$ISeq$
          }
        }()) {
          return true
        }else {
          if(!G__6929__6930.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.type_satisfies_.call(null, cljs.core.ISeq, G__6929__6930)
          }else {
            return false
          }
        }
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.ISeq, G__6929__6930)
      }
    }()) {
      return cljs.core._rest.call(null, coll)
    }else {
      var s__6932 = cljs.core.seq.call(null, coll);
      if(!(s__6932 == null)) {
        return cljs.core._rest.call(null, s__6932)
      }else {
        return cljs.core.List.EMPTY
      }
    }
  }else {
    return cljs.core.List.EMPTY
  }
};
cljs.core.next = function next(coll) {
  if(coll == null) {
    return null
  }else {
    if(function() {
      var G__6936__6937 = coll;
      if(G__6936__6937) {
        if(function() {
          var or__3824__auto____6938 = G__6936__6937.cljs$lang$protocol_mask$partition0$ & 128;
          if(or__3824__auto____6938) {
            return or__3824__auto____6938
          }else {
            return G__6936__6937.cljs$core$INext$
          }
        }()) {
          return true
        }else {
          if(!G__6936__6937.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.type_satisfies_.call(null, cljs.core.INext, G__6936__6937)
          }else {
            return false
          }
        }
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.INext, G__6936__6937)
      }
    }()) {
      return cljs.core._next.call(null, coll)
    }else {
      return cljs.core.seq.call(null, cljs.core.rest.call(null, coll))
    }
  }
};
cljs.core.second = function second(coll) {
  return cljs.core.first.call(null, cljs.core.next.call(null, coll))
};
cljs.core.ffirst = function ffirst(coll) {
  return cljs.core.first.call(null, cljs.core.first.call(null, coll))
};
cljs.core.nfirst = function nfirst(coll) {
  return cljs.core.next.call(null, cljs.core.first.call(null, coll))
};
cljs.core.fnext = function fnext(coll) {
  return cljs.core.first.call(null, cljs.core.next.call(null, coll))
};
cljs.core.nnext = function nnext(coll) {
  return cljs.core.next.call(null, cljs.core.next.call(null, coll))
};
cljs.core.last = function last(s) {
  while(true) {
    var sn__6940 = cljs.core.next.call(null, s);
    if(!(sn__6940 == null)) {
      var G__6941 = sn__6940;
      s = G__6941;
      continue
    }else {
      return cljs.core.first.call(null, s)
    }
    break
  }
};
cljs.core.IEquiv["_"] = true;
cljs.core._equiv["_"] = function(x, o) {
  return x === o
};
cljs.core.not = function not(x) {
  if(cljs.core.truth_(x)) {
    return false
  }else {
    return true
  }
};
cljs.core.conj = function() {
  var conj = null;
  var conj__2 = function(coll, x) {
    return cljs.core._conj.call(null, coll, x)
  };
  var conj__3 = function() {
    var G__6942__delegate = function(coll, x, xs) {
      while(true) {
        if(cljs.core.truth_(xs)) {
          var G__6943 = conj.call(null, coll, x);
          var G__6944 = cljs.core.first.call(null, xs);
          var G__6945 = cljs.core.next.call(null, xs);
          coll = G__6943;
          x = G__6944;
          xs = G__6945;
          continue
        }else {
          return conj.call(null, coll, x)
        }
        break
      }
    };
    var G__6942 = function(coll, x, var_args) {
      var xs = null;
      if(goog.isDef(var_args)) {
        xs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__6942__delegate.call(this, coll, x, xs)
    };
    G__6942.cljs$lang$maxFixedArity = 2;
    G__6942.cljs$lang$applyTo = function(arglist__6946) {
      var coll = cljs.core.first(arglist__6946);
      var x = cljs.core.first(cljs.core.next(arglist__6946));
      var xs = cljs.core.rest(cljs.core.next(arglist__6946));
      return G__6942__delegate(coll, x, xs)
    };
    G__6942.cljs$lang$arity$variadic = G__6942__delegate;
    return G__6942
  }();
  conj = function(coll, x, var_args) {
    var xs = var_args;
    switch(arguments.length) {
      case 2:
        return conj__2.call(this, coll, x);
      default:
        return conj__3.cljs$lang$arity$variadic(coll, x, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  conj.cljs$lang$maxFixedArity = 2;
  conj.cljs$lang$applyTo = conj__3.cljs$lang$applyTo;
  conj.cljs$lang$arity$2 = conj__2;
  conj.cljs$lang$arity$variadic = conj__3.cljs$lang$arity$variadic;
  return conj
}();
cljs.core.empty = function empty(coll) {
  return cljs.core._empty.call(null, coll)
};
cljs.core.accumulating_seq_count = function accumulating_seq_count(coll) {
  var s__6949 = cljs.core.seq.call(null, coll);
  var acc__6950 = 0;
  while(true) {
    if(cljs.core.counted_QMARK_.call(null, s__6949)) {
      return acc__6950 + cljs.core._count.call(null, s__6949)
    }else {
      var G__6951 = cljs.core.next.call(null, s__6949);
      var G__6952 = acc__6950 + 1;
      s__6949 = G__6951;
      acc__6950 = G__6952;
      continue
    }
    break
  }
};
cljs.core.count = function count(coll) {
  if(cljs.core.counted_QMARK_.call(null, coll)) {
    return cljs.core._count.call(null, coll)
  }else {
    return cljs.core.accumulating_seq_count.call(null, coll)
  }
};
cljs.core.linear_traversal_nth = function() {
  var linear_traversal_nth = null;
  var linear_traversal_nth__2 = function(coll, n) {
    if(coll == null) {
      throw new Error("Index out of bounds");
    }else {
      if(n === 0) {
        if(cljs.core.seq.call(null, coll)) {
          return cljs.core.first.call(null, coll)
        }else {
          throw new Error("Index out of bounds");
        }
      }else {
        if(cljs.core.indexed_QMARK_.call(null, coll)) {
          return cljs.core._nth.call(null, coll, n)
        }else {
          if(cljs.core.seq.call(null, coll)) {
            return linear_traversal_nth.call(null, cljs.core.next.call(null, coll), n - 1)
          }else {
            if("\ufdd0'else") {
              throw new Error("Index out of bounds");
            }else {
              return null
            }
          }
        }
      }
    }
  };
  var linear_traversal_nth__3 = function(coll, n, not_found) {
    if(coll == null) {
      return not_found
    }else {
      if(n === 0) {
        if(cljs.core.seq.call(null, coll)) {
          return cljs.core.first.call(null, coll)
        }else {
          return not_found
        }
      }else {
        if(cljs.core.indexed_QMARK_.call(null, coll)) {
          return cljs.core._nth.call(null, coll, n, not_found)
        }else {
          if(cljs.core.seq.call(null, coll)) {
            return linear_traversal_nth.call(null, cljs.core.next.call(null, coll), n - 1, not_found)
          }else {
            if("\ufdd0'else") {
              return not_found
            }else {
              return null
            }
          }
        }
      }
    }
  };
  linear_traversal_nth = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return linear_traversal_nth__2.call(this, coll, n);
      case 3:
        return linear_traversal_nth__3.call(this, coll, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  linear_traversal_nth.cljs$lang$arity$2 = linear_traversal_nth__2;
  linear_traversal_nth.cljs$lang$arity$3 = linear_traversal_nth__3;
  return linear_traversal_nth
}();
cljs.core.nth = function() {
  var nth = null;
  var nth__2 = function(coll, n) {
    if(coll == null) {
      return null
    }else {
      if(function() {
        var G__6959__6960 = coll;
        if(G__6959__6960) {
          if(function() {
            var or__3824__auto____6961 = G__6959__6960.cljs$lang$protocol_mask$partition0$ & 16;
            if(or__3824__auto____6961) {
              return or__3824__auto____6961
            }else {
              return G__6959__6960.cljs$core$IIndexed$
            }
          }()) {
            return true
          }else {
            if(!G__6959__6960.cljs$lang$protocol_mask$partition0$) {
              return cljs.core.type_satisfies_.call(null, cljs.core.IIndexed, G__6959__6960)
            }else {
              return false
            }
          }
        }else {
          return cljs.core.type_satisfies_.call(null, cljs.core.IIndexed, G__6959__6960)
        }
      }()) {
        return cljs.core._nth.call(null, coll, Math.floor(n))
      }else {
        return cljs.core.linear_traversal_nth.call(null, coll, Math.floor(n))
      }
    }
  };
  var nth__3 = function(coll, n, not_found) {
    if(!(coll == null)) {
      if(function() {
        var G__6962__6963 = coll;
        if(G__6962__6963) {
          if(function() {
            var or__3824__auto____6964 = G__6962__6963.cljs$lang$protocol_mask$partition0$ & 16;
            if(or__3824__auto____6964) {
              return or__3824__auto____6964
            }else {
              return G__6962__6963.cljs$core$IIndexed$
            }
          }()) {
            return true
          }else {
            if(!G__6962__6963.cljs$lang$protocol_mask$partition0$) {
              return cljs.core.type_satisfies_.call(null, cljs.core.IIndexed, G__6962__6963)
            }else {
              return false
            }
          }
        }else {
          return cljs.core.type_satisfies_.call(null, cljs.core.IIndexed, G__6962__6963)
        }
      }()) {
        return cljs.core._nth.call(null, coll, Math.floor(n), not_found)
      }else {
        return cljs.core.linear_traversal_nth.call(null, coll, Math.floor(n), not_found)
      }
    }else {
      return not_found
    }
  };
  nth = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return nth__2.call(this, coll, n);
      case 3:
        return nth__3.call(this, coll, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  nth.cljs$lang$arity$2 = nth__2;
  nth.cljs$lang$arity$3 = nth__3;
  return nth
}();
cljs.core.get = function() {
  var get = null;
  var get__2 = function(o, k) {
    return cljs.core._lookup.call(null, o, k)
  };
  var get__3 = function(o, k, not_found) {
    return cljs.core._lookup.call(null, o, k, not_found)
  };
  get = function(o, k, not_found) {
    switch(arguments.length) {
      case 2:
        return get__2.call(this, o, k);
      case 3:
        return get__3.call(this, o, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  get.cljs$lang$arity$2 = get__2;
  get.cljs$lang$arity$3 = get__3;
  return get
}();
cljs.core.assoc = function() {
  var assoc = null;
  var assoc__3 = function(coll, k, v) {
    return cljs.core._assoc.call(null, coll, k, v)
  };
  var assoc__4 = function() {
    var G__6967__delegate = function(coll, k, v, kvs) {
      while(true) {
        var ret__6966 = assoc.call(null, coll, k, v);
        if(cljs.core.truth_(kvs)) {
          var G__6968 = ret__6966;
          var G__6969 = cljs.core.first.call(null, kvs);
          var G__6970 = cljs.core.second.call(null, kvs);
          var G__6971 = cljs.core.nnext.call(null, kvs);
          coll = G__6968;
          k = G__6969;
          v = G__6970;
          kvs = G__6971;
          continue
        }else {
          return ret__6966
        }
        break
      }
    };
    var G__6967 = function(coll, k, v, var_args) {
      var kvs = null;
      if(goog.isDef(var_args)) {
        kvs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__6967__delegate.call(this, coll, k, v, kvs)
    };
    G__6967.cljs$lang$maxFixedArity = 3;
    G__6967.cljs$lang$applyTo = function(arglist__6972) {
      var coll = cljs.core.first(arglist__6972);
      var k = cljs.core.first(cljs.core.next(arglist__6972));
      var v = cljs.core.first(cljs.core.next(cljs.core.next(arglist__6972)));
      var kvs = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__6972)));
      return G__6967__delegate(coll, k, v, kvs)
    };
    G__6967.cljs$lang$arity$variadic = G__6967__delegate;
    return G__6967
  }();
  assoc = function(coll, k, v, var_args) {
    var kvs = var_args;
    switch(arguments.length) {
      case 3:
        return assoc__3.call(this, coll, k, v);
      default:
        return assoc__4.cljs$lang$arity$variadic(coll, k, v, cljs.core.array_seq(arguments, 3))
    }
    throw"Invalid arity: " + arguments.length;
  };
  assoc.cljs$lang$maxFixedArity = 3;
  assoc.cljs$lang$applyTo = assoc__4.cljs$lang$applyTo;
  assoc.cljs$lang$arity$3 = assoc__3;
  assoc.cljs$lang$arity$variadic = assoc__4.cljs$lang$arity$variadic;
  return assoc
}();
cljs.core.dissoc = function() {
  var dissoc = null;
  var dissoc__1 = function(coll) {
    return coll
  };
  var dissoc__2 = function(coll, k) {
    return cljs.core._dissoc.call(null, coll, k)
  };
  var dissoc__3 = function() {
    var G__6975__delegate = function(coll, k, ks) {
      while(true) {
        var ret__6974 = dissoc.call(null, coll, k);
        if(cljs.core.truth_(ks)) {
          var G__6976 = ret__6974;
          var G__6977 = cljs.core.first.call(null, ks);
          var G__6978 = cljs.core.next.call(null, ks);
          coll = G__6976;
          k = G__6977;
          ks = G__6978;
          continue
        }else {
          return ret__6974
        }
        break
      }
    };
    var G__6975 = function(coll, k, var_args) {
      var ks = null;
      if(goog.isDef(var_args)) {
        ks = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__6975__delegate.call(this, coll, k, ks)
    };
    G__6975.cljs$lang$maxFixedArity = 2;
    G__6975.cljs$lang$applyTo = function(arglist__6979) {
      var coll = cljs.core.first(arglist__6979);
      var k = cljs.core.first(cljs.core.next(arglist__6979));
      var ks = cljs.core.rest(cljs.core.next(arglist__6979));
      return G__6975__delegate(coll, k, ks)
    };
    G__6975.cljs$lang$arity$variadic = G__6975__delegate;
    return G__6975
  }();
  dissoc = function(coll, k, var_args) {
    var ks = var_args;
    switch(arguments.length) {
      case 1:
        return dissoc__1.call(this, coll);
      case 2:
        return dissoc__2.call(this, coll, k);
      default:
        return dissoc__3.cljs$lang$arity$variadic(coll, k, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  dissoc.cljs$lang$maxFixedArity = 2;
  dissoc.cljs$lang$applyTo = dissoc__3.cljs$lang$applyTo;
  dissoc.cljs$lang$arity$1 = dissoc__1;
  dissoc.cljs$lang$arity$2 = dissoc__2;
  dissoc.cljs$lang$arity$variadic = dissoc__3.cljs$lang$arity$variadic;
  return dissoc
}();
cljs.core.with_meta = function with_meta(o, meta) {
  return cljs.core._with_meta.call(null, o, meta)
};
cljs.core.meta = function meta(o) {
  if(function() {
    var G__6983__6984 = o;
    if(G__6983__6984) {
      if(function() {
        var or__3824__auto____6985 = G__6983__6984.cljs$lang$protocol_mask$partition0$ & 131072;
        if(or__3824__auto____6985) {
          return or__3824__auto____6985
        }else {
          return G__6983__6984.cljs$core$IMeta$
        }
      }()) {
        return true
      }else {
        if(!G__6983__6984.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.type_satisfies_.call(null, cljs.core.IMeta, G__6983__6984)
        }else {
          return false
        }
      }
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.IMeta, G__6983__6984)
    }
  }()) {
    return cljs.core._meta.call(null, o)
  }else {
    return null
  }
};
cljs.core.peek = function peek(coll) {
  return cljs.core._peek.call(null, coll)
};
cljs.core.pop = function pop(coll) {
  return cljs.core._pop.call(null, coll)
};
cljs.core.disj = function() {
  var disj = null;
  var disj__1 = function(coll) {
    return coll
  };
  var disj__2 = function(coll, k) {
    return cljs.core._disjoin.call(null, coll, k)
  };
  var disj__3 = function() {
    var G__6988__delegate = function(coll, k, ks) {
      while(true) {
        var ret__6987 = disj.call(null, coll, k);
        if(cljs.core.truth_(ks)) {
          var G__6989 = ret__6987;
          var G__6990 = cljs.core.first.call(null, ks);
          var G__6991 = cljs.core.next.call(null, ks);
          coll = G__6989;
          k = G__6990;
          ks = G__6991;
          continue
        }else {
          return ret__6987
        }
        break
      }
    };
    var G__6988 = function(coll, k, var_args) {
      var ks = null;
      if(goog.isDef(var_args)) {
        ks = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__6988__delegate.call(this, coll, k, ks)
    };
    G__6988.cljs$lang$maxFixedArity = 2;
    G__6988.cljs$lang$applyTo = function(arglist__6992) {
      var coll = cljs.core.first(arglist__6992);
      var k = cljs.core.first(cljs.core.next(arglist__6992));
      var ks = cljs.core.rest(cljs.core.next(arglist__6992));
      return G__6988__delegate(coll, k, ks)
    };
    G__6988.cljs$lang$arity$variadic = G__6988__delegate;
    return G__6988
  }();
  disj = function(coll, k, var_args) {
    var ks = var_args;
    switch(arguments.length) {
      case 1:
        return disj__1.call(this, coll);
      case 2:
        return disj__2.call(this, coll, k);
      default:
        return disj__3.cljs$lang$arity$variadic(coll, k, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  disj.cljs$lang$maxFixedArity = 2;
  disj.cljs$lang$applyTo = disj__3.cljs$lang$applyTo;
  disj.cljs$lang$arity$1 = disj__1;
  disj.cljs$lang$arity$2 = disj__2;
  disj.cljs$lang$arity$variadic = disj__3.cljs$lang$arity$variadic;
  return disj
}();
cljs.core.string_hash_cache = {};
cljs.core.string_hash_cache_count = 0;
cljs.core.add_to_string_hash_cache = function add_to_string_hash_cache(k) {
  var h__6994 = goog.string.hashCode(k);
  cljs.core.string_hash_cache[k] = h__6994;
  cljs.core.string_hash_cache_count = cljs.core.string_hash_cache_count + 1;
  return h__6994
};
cljs.core.check_string_hash_cache = function check_string_hash_cache(k) {
  if(cljs.core.string_hash_cache_count > 255) {
    cljs.core.string_hash_cache = {};
    cljs.core.string_hash_cache_count = 0
  }else {
  }
  var h__6996 = cljs.core.string_hash_cache[k];
  if(!(h__6996 == null)) {
    return h__6996
  }else {
    return cljs.core.add_to_string_hash_cache.call(null, k)
  }
};
cljs.core.hash = function() {
  var hash = null;
  var hash__1 = function(o) {
    return hash.call(null, o, true)
  };
  var hash__2 = function(o, check_cache) {
    if(function() {
      var and__3822__auto____6998 = goog.isString(o);
      if(and__3822__auto____6998) {
        return check_cache
      }else {
        return and__3822__auto____6998
      }
    }()) {
      return cljs.core.check_string_hash_cache.call(null, o)
    }else {
      return cljs.core._hash.call(null, o)
    }
  };
  hash = function(o, check_cache) {
    switch(arguments.length) {
      case 1:
        return hash__1.call(this, o);
      case 2:
        return hash__2.call(this, o, check_cache)
    }
    throw"Invalid arity: " + arguments.length;
  };
  hash.cljs$lang$arity$1 = hash__1;
  hash.cljs$lang$arity$2 = hash__2;
  return hash
}();
cljs.core.empty_QMARK_ = function empty_QMARK_(coll) {
  return cljs.core.not.call(null, cljs.core.seq.call(null, coll))
};
cljs.core.coll_QMARK_ = function coll_QMARK_(x) {
  if(x == null) {
    return false
  }else {
    var G__7002__7003 = x;
    if(G__7002__7003) {
      if(function() {
        var or__3824__auto____7004 = G__7002__7003.cljs$lang$protocol_mask$partition0$ & 8;
        if(or__3824__auto____7004) {
          return or__3824__auto____7004
        }else {
          return G__7002__7003.cljs$core$ICollection$
        }
      }()) {
        return true
      }else {
        if(!G__7002__7003.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.type_satisfies_.call(null, cljs.core.ICollection, G__7002__7003)
        }else {
          return false
        }
      }
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.ICollection, G__7002__7003)
    }
  }
};
cljs.core.set_QMARK_ = function set_QMARK_(x) {
  if(x == null) {
    return false
  }else {
    var G__7008__7009 = x;
    if(G__7008__7009) {
      if(function() {
        var or__3824__auto____7010 = G__7008__7009.cljs$lang$protocol_mask$partition0$ & 4096;
        if(or__3824__auto____7010) {
          return or__3824__auto____7010
        }else {
          return G__7008__7009.cljs$core$ISet$
        }
      }()) {
        return true
      }else {
        if(!G__7008__7009.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.type_satisfies_.call(null, cljs.core.ISet, G__7008__7009)
        }else {
          return false
        }
      }
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.ISet, G__7008__7009)
    }
  }
};
cljs.core.associative_QMARK_ = function associative_QMARK_(x) {
  var G__7014__7015 = x;
  if(G__7014__7015) {
    if(function() {
      var or__3824__auto____7016 = G__7014__7015.cljs$lang$protocol_mask$partition0$ & 512;
      if(or__3824__auto____7016) {
        return or__3824__auto____7016
      }else {
        return G__7014__7015.cljs$core$IAssociative$
      }
    }()) {
      return true
    }else {
      if(!G__7014__7015.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.IAssociative, G__7014__7015)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IAssociative, G__7014__7015)
  }
};
cljs.core.sequential_QMARK_ = function sequential_QMARK_(x) {
  var G__7020__7021 = x;
  if(G__7020__7021) {
    if(function() {
      var or__3824__auto____7022 = G__7020__7021.cljs$lang$protocol_mask$partition0$ & 16777216;
      if(or__3824__auto____7022) {
        return or__3824__auto____7022
      }else {
        return G__7020__7021.cljs$core$ISequential$
      }
    }()) {
      return true
    }else {
      if(!G__7020__7021.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.ISequential, G__7020__7021)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.ISequential, G__7020__7021)
  }
};
cljs.core.counted_QMARK_ = function counted_QMARK_(x) {
  var G__7026__7027 = x;
  if(G__7026__7027) {
    if(function() {
      var or__3824__auto____7028 = G__7026__7027.cljs$lang$protocol_mask$partition0$ & 2;
      if(or__3824__auto____7028) {
        return or__3824__auto____7028
      }else {
        return G__7026__7027.cljs$core$ICounted$
      }
    }()) {
      return true
    }else {
      if(!G__7026__7027.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.ICounted, G__7026__7027)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.ICounted, G__7026__7027)
  }
};
cljs.core.indexed_QMARK_ = function indexed_QMARK_(x) {
  var G__7032__7033 = x;
  if(G__7032__7033) {
    if(function() {
      var or__3824__auto____7034 = G__7032__7033.cljs$lang$protocol_mask$partition0$ & 16;
      if(or__3824__auto____7034) {
        return or__3824__auto____7034
      }else {
        return G__7032__7033.cljs$core$IIndexed$
      }
    }()) {
      return true
    }else {
      if(!G__7032__7033.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.IIndexed, G__7032__7033)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IIndexed, G__7032__7033)
  }
};
cljs.core.reduceable_QMARK_ = function reduceable_QMARK_(x) {
  var G__7038__7039 = x;
  if(G__7038__7039) {
    if(function() {
      var or__3824__auto____7040 = G__7038__7039.cljs$lang$protocol_mask$partition0$ & 524288;
      if(or__3824__auto____7040) {
        return or__3824__auto____7040
      }else {
        return G__7038__7039.cljs$core$IReduce$
      }
    }()) {
      return true
    }else {
      if(!G__7038__7039.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.IReduce, G__7038__7039)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IReduce, G__7038__7039)
  }
};
cljs.core.map_QMARK_ = function map_QMARK_(x) {
  if(x == null) {
    return false
  }else {
    var G__7044__7045 = x;
    if(G__7044__7045) {
      if(function() {
        var or__3824__auto____7046 = G__7044__7045.cljs$lang$protocol_mask$partition0$ & 1024;
        if(or__3824__auto____7046) {
          return or__3824__auto____7046
        }else {
          return G__7044__7045.cljs$core$IMap$
        }
      }()) {
        return true
      }else {
        if(!G__7044__7045.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.type_satisfies_.call(null, cljs.core.IMap, G__7044__7045)
        }else {
          return false
        }
      }
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.IMap, G__7044__7045)
    }
  }
};
cljs.core.vector_QMARK_ = function vector_QMARK_(x) {
  var G__7050__7051 = x;
  if(G__7050__7051) {
    if(function() {
      var or__3824__auto____7052 = G__7050__7051.cljs$lang$protocol_mask$partition0$ & 16384;
      if(or__3824__auto____7052) {
        return or__3824__auto____7052
      }else {
        return G__7050__7051.cljs$core$IVector$
      }
    }()) {
      return true
    }else {
      if(!G__7050__7051.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.IVector, G__7050__7051)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IVector, G__7050__7051)
  }
};
cljs.core.chunked_seq_QMARK_ = function chunked_seq_QMARK_(x) {
  var G__7056__7057 = x;
  if(G__7056__7057) {
    if(cljs.core.truth_(function() {
      var or__3824__auto____7058 = null;
      if(cljs.core.truth_(or__3824__auto____7058)) {
        return or__3824__auto____7058
      }else {
        return G__7056__7057.cljs$core$IChunkedSeq$
      }
    }())) {
      return true
    }else {
      if(!G__7056__7057.cljs$lang$protocol_mask$partition$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.IChunkedSeq, G__7056__7057)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IChunkedSeq, G__7056__7057)
  }
};
cljs.core.js_obj = function() {
  var js_obj = null;
  var js_obj__0 = function() {
    return{}
  };
  var js_obj__1 = function() {
    var G__7059__delegate = function(keyvals) {
      return cljs.core.apply.call(null, goog.object.create, keyvals)
    };
    var G__7059 = function(var_args) {
      var keyvals = null;
      if(goog.isDef(var_args)) {
        keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
      }
      return G__7059__delegate.call(this, keyvals)
    };
    G__7059.cljs$lang$maxFixedArity = 0;
    G__7059.cljs$lang$applyTo = function(arglist__7060) {
      var keyvals = cljs.core.seq(arglist__7060);
      return G__7059__delegate(keyvals)
    };
    G__7059.cljs$lang$arity$variadic = G__7059__delegate;
    return G__7059
  }();
  js_obj = function(var_args) {
    var keyvals = var_args;
    switch(arguments.length) {
      case 0:
        return js_obj__0.call(this);
      default:
        return js_obj__1.cljs$lang$arity$variadic(cljs.core.array_seq(arguments, 0))
    }
    throw"Invalid arity: " + arguments.length;
  };
  js_obj.cljs$lang$maxFixedArity = 0;
  js_obj.cljs$lang$applyTo = js_obj__1.cljs$lang$applyTo;
  js_obj.cljs$lang$arity$0 = js_obj__0;
  js_obj.cljs$lang$arity$variadic = js_obj__1.cljs$lang$arity$variadic;
  return js_obj
}();
cljs.core.js_keys = function js_keys(obj) {
  var keys__7062 = [];
  goog.object.forEach(obj, function(val, key, obj) {
    return keys__7062.push(key)
  });
  return keys__7062
};
cljs.core.js_delete = function js_delete(obj, key) {
  return delete obj[key]
};
cljs.core.array_copy = function array_copy(from, i, to, j, len) {
  var i__7066 = i;
  var j__7067 = j;
  var len__7068 = len;
  while(true) {
    if(len__7068 === 0) {
      return to
    }else {
      to[j__7067] = from[i__7066];
      var G__7069 = i__7066 + 1;
      var G__7070 = j__7067 + 1;
      var G__7071 = len__7068 - 1;
      i__7066 = G__7069;
      j__7067 = G__7070;
      len__7068 = G__7071;
      continue
    }
    break
  }
};
cljs.core.array_copy_downward = function array_copy_downward(from, i, to, j, len) {
  var i__7075 = i + (len - 1);
  var j__7076 = j + (len - 1);
  var len__7077 = len;
  while(true) {
    if(len__7077 === 0) {
      return to
    }else {
      to[j__7076] = from[i__7075];
      var G__7078 = i__7075 - 1;
      var G__7079 = j__7076 - 1;
      var G__7080 = len__7077 - 1;
      i__7075 = G__7078;
      j__7076 = G__7079;
      len__7077 = G__7080;
      continue
    }
    break
  }
};
cljs.core.lookup_sentinel = {};
cljs.core.false_QMARK_ = function false_QMARK_(x) {
  return x === false
};
cljs.core.true_QMARK_ = function true_QMARK_(x) {
  return x === true
};
cljs.core.undefined_QMARK_ = function undefined_QMARK_(x) {
  return void 0 === x
};
cljs.core.seq_QMARK_ = function seq_QMARK_(s) {
  if(s == null) {
    return false
  }else {
    var G__7084__7085 = s;
    if(G__7084__7085) {
      if(function() {
        var or__3824__auto____7086 = G__7084__7085.cljs$lang$protocol_mask$partition0$ & 64;
        if(or__3824__auto____7086) {
          return or__3824__auto____7086
        }else {
          return G__7084__7085.cljs$core$ISeq$
        }
      }()) {
        return true
      }else {
        if(!G__7084__7085.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.type_satisfies_.call(null, cljs.core.ISeq, G__7084__7085)
        }else {
          return false
        }
      }
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.ISeq, G__7084__7085)
    }
  }
};
cljs.core.seqable_QMARK_ = function seqable_QMARK_(s) {
  var G__7090__7091 = s;
  if(G__7090__7091) {
    if(function() {
      var or__3824__auto____7092 = G__7090__7091.cljs$lang$protocol_mask$partition0$ & 8388608;
      if(or__3824__auto____7092) {
        return or__3824__auto____7092
      }else {
        return G__7090__7091.cljs$core$ISeqable$
      }
    }()) {
      return true
    }else {
      if(!G__7090__7091.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.ISeqable, G__7090__7091)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.ISeqable, G__7090__7091)
  }
};
cljs.core.boolean$ = function boolean$(x) {
  if(cljs.core.truth_(x)) {
    return true
  }else {
    return false
  }
};
cljs.core.string_QMARK_ = function string_QMARK_(x) {
  var and__3822__auto____7095 = goog.isString(x);
  if(and__3822__auto____7095) {
    return!function() {
      var or__3824__auto____7096 = x.charAt(0) === "\ufdd0";
      if(or__3824__auto____7096) {
        return or__3824__auto____7096
      }else {
        return x.charAt(0) === "\ufdd1"
      }
    }()
  }else {
    return and__3822__auto____7095
  }
};
cljs.core.keyword_QMARK_ = function keyword_QMARK_(x) {
  var and__3822__auto____7098 = goog.isString(x);
  if(and__3822__auto____7098) {
    return x.charAt(0) === "\ufdd0"
  }else {
    return and__3822__auto____7098
  }
};
cljs.core.symbol_QMARK_ = function symbol_QMARK_(x) {
  var and__3822__auto____7100 = goog.isString(x);
  if(and__3822__auto____7100) {
    return x.charAt(0) === "\ufdd1"
  }else {
    return and__3822__auto____7100
  }
};
cljs.core.number_QMARK_ = function number_QMARK_(n) {
  return goog.isNumber(n)
};
cljs.core.fn_QMARK_ = function fn_QMARK_(f) {
  return goog.isFunction(f)
};
cljs.core.ifn_QMARK_ = function ifn_QMARK_(f) {
  var or__3824__auto____7105 = cljs.core.fn_QMARK_.call(null, f);
  if(or__3824__auto____7105) {
    return or__3824__auto____7105
  }else {
    var G__7106__7107 = f;
    if(G__7106__7107) {
      if(function() {
        var or__3824__auto____7108 = G__7106__7107.cljs$lang$protocol_mask$partition0$ & 1;
        if(or__3824__auto____7108) {
          return or__3824__auto____7108
        }else {
          return G__7106__7107.cljs$core$IFn$
        }
      }()) {
        return true
      }else {
        if(!G__7106__7107.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.type_satisfies_.call(null, cljs.core.IFn, G__7106__7107)
        }else {
          return false
        }
      }
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.IFn, G__7106__7107)
    }
  }
};
cljs.core.integer_QMARK_ = function integer_QMARK_(n) {
  var and__3822__auto____7110 = cljs.core.number_QMARK_.call(null, n);
  if(and__3822__auto____7110) {
    return n == n.toFixed()
  }else {
    return and__3822__auto____7110
  }
};
cljs.core.contains_QMARK_ = function contains_QMARK_(coll, v) {
  if(cljs.core._lookup.call(null, coll, v, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel) {
    return false
  }else {
    return true
  }
};
cljs.core.find = function find(coll, k) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____7113 = coll;
    if(cljs.core.truth_(and__3822__auto____7113)) {
      var and__3822__auto____7114 = cljs.core.associative_QMARK_.call(null, coll);
      if(and__3822__auto____7114) {
        return cljs.core.contains_QMARK_.call(null, coll, k)
      }else {
        return and__3822__auto____7114
      }
    }else {
      return and__3822__auto____7113
    }
  }())) {
    return cljs.core.PersistentVector.fromArray([k, cljs.core._lookup.call(null, coll, k)], true)
  }else {
    return null
  }
};
cljs.core.distinct_QMARK_ = function() {
  var distinct_QMARK_ = null;
  var distinct_QMARK___1 = function(x) {
    return true
  };
  var distinct_QMARK___2 = function(x, y) {
    return!cljs.core._EQ_.call(null, x, y)
  };
  var distinct_QMARK___3 = function() {
    var G__7123__delegate = function(x, y, more) {
      if(!cljs.core._EQ_.call(null, x, y)) {
        var s__7119 = cljs.core.PersistentHashSet.fromArray([y, x]);
        var xs__7120 = more;
        while(true) {
          var x__7121 = cljs.core.first.call(null, xs__7120);
          var etc__7122 = cljs.core.next.call(null, xs__7120);
          if(cljs.core.truth_(xs__7120)) {
            if(cljs.core.contains_QMARK_.call(null, s__7119, x__7121)) {
              return false
            }else {
              var G__7124 = cljs.core.conj.call(null, s__7119, x__7121);
              var G__7125 = etc__7122;
              s__7119 = G__7124;
              xs__7120 = G__7125;
              continue
            }
          }else {
            return true
          }
          break
        }
      }else {
        return false
      }
    };
    var G__7123 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7123__delegate.call(this, x, y, more)
    };
    G__7123.cljs$lang$maxFixedArity = 2;
    G__7123.cljs$lang$applyTo = function(arglist__7126) {
      var x = cljs.core.first(arglist__7126);
      var y = cljs.core.first(cljs.core.next(arglist__7126));
      var more = cljs.core.rest(cljs.core.next(arglist__7126));
      return G__7123__delegate(x, y, more)
    };
    G__7123.cljs$lang$arity$variadic = G__7123__delegate;
    return G__7123
  }();
  distinct_QMARK_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return distinct_QMARK___1.call(this, x);
      case 2:
        return distinct_QMARK___2.call(this, x, y);
      default:
        return distinct_QMARK___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  distinct_QMARK_.cljs$lang$maxFixedArity = 2;
  distinct_QMARK_.cljs$lang$applyTo = distinct_QMARK___3.cljs$lang$applyTo;
  distinct_QMARK_.cljs$lang$arity$1 = distinct_QMARK___1;
  distinct_QMARK_.cljs$lang$arity$2 = distinct_QMARK___2;
  distinct_QMARK_.cljs$lang$arity$variadic = distinct_QMARK___3.cljs$lang$arity$variadic;
  return distinct_QMARK_
}();
cljs.core.compare = function compare(x, y) {
  if(x === y) {
    return 0
  }else {
    if(x == null) {
      return-1
    }else {
      if(y == null) {
        return 1
      }else {
        if(cljs.core.type.call(null, x) === cljs.core.type.call(null, y)) {
          if(function() {
            var G__7130__7131 = x;
            if(G__7130__7131) {
              if(cljs.core.truth_(function() {
                var or__3824__auto____7132 = null;
                if(cljs.core.truth_(or__3824__auto____7132)) {
                  return or__3824__auto____7132
                }else {
                  return G__7130__7131.cljs$core$IComparable$
                }
              }())) {
                return true
              }else {
                if(!G__7130__7131.cljs$lang$protocol_mask$partition$) {
                  return cljs.core.type_satisfies_.call(null, cljs.core.IComparable, G__7130__7131)
                }else {
                  return false
                }
              }
            }else {
              return cljs.core.type_satisfies_.call(null, cljs.core.IComparable, G__7130__7131)
            }
          }()) {
            return cljs.core._compare.call(null, x, y)
          }else {
            return goog.array.defaultCompare(x, y)
          }
        }else {
          if("\ufdd0'else") {
            throw new Error("compare on non-nil objects of different types");
          }else {
            return null
          }
        }
      }
    }
  }
};
cljs.core.compare_indexed = function() {
  var compare_indexed = null;
  var compare_indexed__2 = function(xs, ys) {
    var xl__7137 = cljs.core.count.call(null, xs);
    var yl__7138 = cljs.core.count.call(null, ys);
    if(xl__7137 < yl__7138) {
      return-1
    }else {
      if(xl__7137 > yl__7138) {
        return 1
      }else {
        if("\ufdd0'else") {
          return compare_indexed.call(null, xs, ys, xl__7137, 0)
        }else {
          return null
        }
      }
    }
  };
  var compare_indexed__4 = function(xs, ys, len, n) {
    while(true) {
      var d__7139 = cljs.core.compare.call(null, cljs.core.nth.call(null, xs, n), cljs.core.nth.call(null, ys, n));
      if(function() {
        var and__3822__auto____7140 = d__7139 === 0;
        if(and__3822__auto____7140) {
          return n + 1 < len
        }else {
          return and__3822__auto____7140
        }
      }()) {
        var G__7141 = xs;
        var G__7142 = ys;
        var G__7143 = len;
        var G__7144 = n + 1;
        xs = G__7141;
        ys = G__7142;
        len = G__7143;
        n = G__7144;
        continue
      }else {
        return d__7139
      }
      break
    }
  };
  compare_indexed = function(xs, ys, len, n) {
    switch(arguments.length) {
      case 2:
        return compare_indexed__2.call(this, xs, ys);
      case 4:
        return compare_indexed__4.call(this, xs, ys, len, n)
    }
    throw"Invalid arity: " + arguments.length;
  };
  compare_indexed.cljs$lang$arity$2 = compare_indexed__2;
  compare_indexed.cljs$lang$arity$4 = compare_indexed__4;
  return compare_indexed
}();
cljs.core.fn__GT_comparator = function fn__GT_comparator(f) {
  if(cljs.core._EQ_.call(null, f, cljs.core.compare)) {
    return cljs.core.compare
  }else {
    return function(x, y) {
      var r__7146 = f.call(null, x, y);
      if(cljs.core.number_QMARK_.call(null, r__7146)) {
        return r__7146
      }else {
        if(cljs.core.truth_(r__7146)) {
          return-1
        }else {
          if(cljs.core.truth_(f.call(null, y, x))) {
            return 1
          }else {
            return 0
          }
        }
      }
    }
  }
};
cljs.core.sort = function() {
  var sort = null;
  var sort__1 = function(coll) {
    return sort.call(null, cljs.core.compare, coll)
  };
  var sort__2 = function(comp, coll) {
    if(cljs.core.seq.call(null, coll)) {
      var a__7148 = cljs.core.to_array.call(null, coll);
      goog.array.stableSort(a__7148, cljs.core.fn__GT_comparator.call(null, comp));
      return cljs.core.seq.call(null, a__7148)
    }else {
      return cljs.core.List.EMPTY
    }
  };
  sort = function(comp, coll) {
    switch(arguments.length) {
      case 1:
        return sort__1.call(this, comp);
      case 2:
        return sort__2.call(this, comp, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  sort.cljs$lang$arity$1 = sort__1;
  sort.cljs$lang$arity$2 = sort__2;
  return sort
}();
cljs.core.sort_by = function() {
  var sort_by = null;
  var sort_by__2 = function(keyfn, coll) {
    return sort_by.call(null, keyfn, cljs.core.compare, coll)
  };
  var sort_by__3 = function(keyfn, comp, coll) {
    return cljs.core.sort.call(null, function(x, y) {
      return cljs.core.fn__GT_comparator.call(null, comp).call(null, keyfn.call(null, x), keyfn.call(null, y))
    }, coll)
  };
  sort_by = function(keyfn, comp, coll) {
    switch(arguments.length) {
      case 2:
        return sort_by__2.call(this, keyfn, comp);
      case 3:
        return sort_by__3.call(this, keyfn, comp, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  sort_by.cljs$lang$arity$2 = sort_by__2;
  sort_by.cljs$lang$arity$3 = sort_by__3;
  return sort_by
}();
cljs.core.seq_reduce = function() {
  var seq_reduce = null;
  var seq_reduce__2 = function(f, coll) {
    var temp__3971__auto____7154 = cljs.core.seq.call(null, coll);
    if(temp__3971__auto____7154) {
      var s__7155 = temp__3971__auto____7154;
      return cljs.core.reduce.call(null, f, cljs.core.first.call(null, s__7155), cljs.core.next.call(null, s__7155))
    }else {
      return f.call(null)
    }
  };
  var seq_reduce__3 = function(f, val, coll) {
    var val__7156 = val;
    var coll__7157 = cljs.core.seq.call(null, coll);
    while(true) {
      if(coll__7157) {
        var nval__7158 = f.call(null, val__7156, cljs.core.first.call(null, coll__7157));
        if(cljs.core.reduced_QMARK_.call(null, nval__7158)) {
          return cljs.core.deref.call(null, nval__7158)
        }else {
          var G__7159 = nval__7158;
          var G__7160 = cljs.core.next.call(null, coll__7157);
          val__7156 = G__7159;
          coll__7157 = G__7160;
          continue
        }
      }else {
        return val__7156
      }
      break
    }
  };
  seq_reduce = function(f, val, coll) {
    switch(arguments.length) {
      case 2:
        return seq_reduce__2.call(this, f, val);
      case 3:
        return seq_reduce__3.call(this, f, val, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  seq_reduce.cljs$lang$arity$2 = seq_reduce__2;
  seq_reduce.cljs$lang$arity$3 = seq_reduce__3;
  return seq_reduce
}();
cljs.core.shuffle = function shuffle(coll) {
  var a__7162 = cljs.core.to_array.call(null, coll);
  goog.array.shuffle(a__7162);
  return cljs.core.vec.call(null, a__7162)
};
cljs.core.reduce = function() {
  var reduce = null;
  var reduce__2 = function(f, coll) {
    if(function() {
      var G__7169__7170 = coll;
      if(G__7169__7170) {
        if(function() {
          var or__3824__auto____7171 = G__7169__7170.cljs$lang$protocol_mask$partition0$ & 524288;
          if(or__3824__auto____7171) {
            return or__3824__auto____7171
          }else {
            return G__7169__7170.cljs$core$IReduce$
          }
        }()) {
          return true
        }else {
          if(!G__7169__7170.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.type_satisfies_.call(null, cljs.core.IReduce, G__7169__7170)
          }else {
            return false
          }
        }
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.IReduce, G__7169__7170)
      }
    }()) {
      return cljs.core._reduce.call(null, coll, f)
    }else {
      return cljs.core.seq_reduce.call(null, f, coll)
    }
  };
  var reduce__3 = function(f, val, coll) {
    if(function() {
      var G__7172__7173 = coll;
      if(G__7172__7173) {
        if(function() {
          var or__3824__auto____7174 = G__7172__7173.cljs$lang$protocol_mask$partition0$ & 524288;
          if(or__3824__auto____7174) {
            return or__3824__auto____7174
          }else {
            return G__7172__7173.cljs$core$IReduce$
          }
        }()) {
          return true
        }else {
          if(!G__7172__7173.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.type_satisfies_.call(null, cljs.core.IReduce, G__7172__7173)
          }else {
            return false
          }
        }
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.IReduce, G__7172__7173)
      }
    }()) {
      return cljs.core._reduce.call(null, coll, f, val)
    }else {
      return cljs.core.seq_reduce.call(null, f, val, coll)
    }
  };
  reduce = function(f, val, coll) {
    switch(arguments.length) {
      case 2:
        return reduce__2.call(this, f, val);
      case 3:
        return reduce__3.call(this, f, val, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  reduce.cljs$lang$arity$2 = reduce__2;
  reduce.cljs$lang$arity$3 = reduce__3;
  return reduce
}();
cljs.core.reduce_kv = function reduce_kv(f, init, coll) {
  return cljs.core._kv_reduce.call(null, coll, f, init)
};
cljs.core.Reduced = function(val) {
  this.val = val;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32768
};
cljs.core.Reduced.cljs$lang$type = true;
cljs.core.Reduced.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/Reduced")
};
cljs.core.Reduced.prototype.cljs$core$IDeref$_deref$arity$1 = function(o) {
  var this__7175 = this;
  return this__7175.val
};
cljs.core.Reduced;
cljs.core.reduced_QMARK_ = function reduced_QMARK_(r) {
  return cljs.core.instance_QMARK_.call(null, cljs.core.Reduced, r)
};
cljs.core.reduced = function reduced(x) {
  return new cljs.core.Reduced(x)
};
cljs.core._PLUS_ = function() {
  var _PLUS_ = null;
  var _PLUS___0 = function() {
    return 0
  };
  var _PLUS___1 = function(x) {
    return x
  };
  var _PLUS___2 = function(x, y) {
    return x + y
  };
  var _PLUS___3 = function() {
    var G__7176__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _PLUS_, x + y, more)
    };
    var G__7176 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7176__delegate.call(this, x, y, more)
    };
    G__7176.cljs$lang$maxFixedArity = 2;
    G__7176.cljs$lang$applyTo = function(arglist__7177) {
      var x = cljs.core.first(arglist__7177);
      var y = cljs.core.first(cljs.core.next(arglist__7177));
      var more = cljs.core.rest(cljs.core.next(arglist__7177));
      return G__7176__delegate(x, y, more)
    };
    G__7176.cljs$lang$arity$variadic = G__7176__delegate;
    return G__7176
  }();
  _PLUS_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 0:
        return _PLUS___0.call(this);
      case 1:
        return _PLUS___1.call(this, x);
      case 2:
        return _PLUS___2.call(this, x, y);
      default:
        return _PLUS___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _PLUS_.cljs$lang$maxFixedArity = 2;
  _PLUS_.cljs$lang$applyTo = _PLUS___3.cljs$lang$applyTo;
  _PLUS_.cljs$lang$arity$0 = _PLUS___0;
  _PLUS_.cljs$lang$arity$1 = _PLUS___1;
  _PLUS_.cljs$lang$arity$2 = _PLUS___2;
  _PLUS_.cljs$lang$arity$variadic = _PLUS___3.cljs$lang$arity$variadic;
  return _PLUS_
}();
cljs.core._ = function() {
  var _ = null;
  var ___1 = function(x) {
    return-x
  };
  var ___2 = function(x, y) {
    return x - y
  };
  var ___3 = function() {
    var G__7178__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _, x - y, more)
    };
    var G__7178 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7178__delegate.call(this, x, y, more)
    };
    G__7178.cljs$lang$maxFixedArity = 2;
    G__7178.cljs$lang$applyTo = function(arglist__7179) {
      var x = cljs.core.first(arglist__7179);
      var y = cljs.core.first(cljs.core.next(arglist__7179));
      var more = cljs.core.rest(cljs.core.next(arglist__7179));
      return G__7178__delegate(x, y, more)
    };
    G__7178.cljs$lang$arity$variadic = G__7178__delegate;
    return G__7178
  }();
  _ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return ___1.call(this, x);
      case 2:
        return ___2.call(this, x, y);
      default:
        return ___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _.cljs$lang$maxFixedArity = 2;
  _.cljs$lang$applyTo = ___3.cljs$lang$applyTo;
  _.cljs$lang$arity$1 = ___1;
  _.cljs$lang$arity$2 = ___2;
  _.cljs$lang$arity$variadic = ___3.cljs$lang$arity$variadic;
  return _
}();
cljs.core._STAR_ = function() {
  var _STAR_ = null;
  var _STAR___0 = function() {
    return 1
  };
  var _STAR___1 = function(x) {
    return x
  };
  var _STAR___2 = function(x, y) {
    return x * y
  };
  var _STAR___3 = function() {
    var G__7180__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _STAR_, x * y, more)
    };
    var G__7180 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7180__delegate.call(this, x, y, more)
    };
    G__7180.cljs$lang$maxFixedArity = 2;
    G__7180.cljs$lang$applyTo = function(arglist__7181) {
      var x = cljs.core.first(arglist__7181);
      var y = cljs.core.first(cljs.core.next(arglist__7181));
      var more = cljs.core.rest(cljs.core.next(arglist__7181));
      return G__7180__delegate(x, y, more)
    };
    G__7180.cljs$lang$arity$variadic = G__7180__delegate;
    return G__7180
  }();
  _STAR_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 0:
        return _STAR___0.call(this);
      case 1:
        return _STAR___1.call(this, x);
      case 2:
        return _STAR___2.call(this, x, y);
      default:
        return _STAR___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _STAR_.cljs$lang$maxFixedArity = 2;
  _STAR_.cljs$lang$applyTo = _STAR___3.cljs$lang$applyTo;
  _STAR_.cljs$lang$arity$0 = _STAR___0;
  _STAR_.cljs$lang$arity$1 = _STAR___1;
  _STAR_.cljs$lang$arity$2 = _STAR___2;
  _STAR_.cljs$lang$arity$variadic = _STAR___3.cljs$lang$arity$variadic;
  return _STAR_
}();
cljs.core._SLASH_ = function() {
  var _SLASH_ = null;
  var _SLASH___1 = function(x) {
    return _SLASH_.call(null, 1, x)
  };
  var _SLASH___2 = function(x, y) {
    return x / y
  };
  var _SLASH___3 = function() {
    var G__7182__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _SLASH_, _SLASH_.call(null, x, y), more)
    };
    var G__7182 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7182__delegate.call(this, x, y, more)
    };
    G__7182.cljs$lang$maxFixedArity = 2;
    G__7182.cljs$lang$applyTo = function(arglist__7183) {
      var x = cljs.core.first(arglist__7183);
      var y = cljs.core.first(cljs.core.next(arglist__7183));
      var more = cljs.core.rest(cljs.core.next(arglist__7183));
      return G__7182__delegate(x, y, more)
    };
    G__7182.cljs$lang$arity$variadic = G__7182__delegate;
    return G__7182
  }();
  _SLASH_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _SLASH___1.call(this, x);
      case 2:
        return _SLASH___2.call(this, x, y);
      default:
        return _SLASH___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _SLASH_.cljs$lang$maxFixedArity = 2;
  _SLASH_.cljs$lang$applyTo = _SLASH___3.cljs$lang$applyTo;
  _SLASH_.cljs$lang$arity$1 = _SLASH___1;
  _SLASH_.cljs$lang$arity$2 = _SLASH___2;
  _SLASH_.cljs$lang$arity$variadic = _SLASH___3.cljs$lang$arity$variadic;
  return _SLASH_
}();
cljs.core._LT_ = function() {
  var _LT_ = null;
  var _LT___1 = function(x) {
    return true
  };
  var _LT___2 = function(x, y) {
    return x < y
  };
  var _LT___3 = function() {
    var G__7184__delegate = function(x, y, more) {
      while(true) {
        if(x < y) {
          if(cljs.core.next.call(null, more)) {
            var G__7185 = y;
            var G__7186 = cljs.core.first.call(null, more);
            var G__7187 = cljs.core.next.call(null, more);
            x = G__7185;
            y = G__7186;
            more = G__7187;
            continue
          }else {
            return y < cljs.core.first.call(null, more)
          }
        }else {
          return false
        }
        break
      }
    };
    var G__7184 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7184__delegate.call(this, x, y, more)
    };
    G__7184.cljs$lang$maxFixedArity = 2;
    G__7184.cljs$lang$applyTo = function(arglist__7188) {
      var x = cljs.core.first(arglist__7188);
      var y = cljs.core.first(cljs.core.next(arglist__7188));
      var more = cljs.core.rest(cljs.core.next(arglist__7188));
      return G__7184__delegate(x, y, more)
    };
    G__7184.cljs$lang$arity$variadic = G__7184__delegate;
    return G__7184
  }();
  _LT_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _LT___1.call(this, x);
      case 2:
        return _LT___2.call(this, x, y);
      default:
        return _LT___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _LT_.cljs$lang$maxFixedArity = 2;
  _LT_.cljs$lang$applyTo = _LT___3.cljs$lang$applyTo;
  _LT_.cljs$lang$arity$1 = _LT___1;
  _LT_.cljs$lang$arity$2 = _LT___2;
  _LT_.cljs$lang$arity$variadic = _LT___3.cljs$lang$arity$variadic;
  return _LT_
}();
cljs.core._LT__EQ_ = function() {
  var _LT__EQ_ = null;
  var _LT__EQ___1 = function(x) {
    return true
  };
  var _LT__EQ___2 = function(x, y) {
    return x <= y
  };
  var _LT__EQ___3 = function() {
    var G__7189__delegate = function(x, y, more) {
      while(true) {
        if(x <= y) {
          if(cljs.core.next.call(null, more)) {
            var G__7190 = y;
            var G__7191 = cljs.core.first.call(null, more);
            var G__7192 = cljs.core.next.call(null, more);
            x = G__7190;
            y = G__7191;
            more = G__7192;
            continue
          }else {
            return y <= cljs.core.first.call(null, more)
          }
        }else {
          return false
        }
        break
      }
    };
    var G__7189 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7189__delegate.call(this, x, y, more)
    };
    G__7189.cljs$lang$maxFixedArity = 2;
    G__7189.cljs$lang$applyTo = function(arglist__7193) {
      var x = cljs.core.first(arglist__7193);
      var y = cljs.core.first(cljs.core.next(arglist__7193));
      var more = cljs.core.rest(cljs.core.next(arglist__7193));
      return G__7189__delegate(x, y, more)
    };
    G__7189.cljs$lang$arity$variadic = G__7189__delegate;
    return G__7189
  }();
  _LT__EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _LT__EQ___1.call(this, x);
      case 2:
        return _LT__EQ___2.call(this, x, y);
      default:
        return _LT__EQ___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _LT__EQ_.cljs$lang$maxFixedArity = 2;
  _LT__EQ_.cljs$lang$applyTo = _LT__EQ___3.cljs$lang$applyTo;
  _LT__EQ_.cljs$lang$arity$1 = _LT__EQ___1;
  _LT__EQ_.cljs$lang$arity$2 = _LT__EQ___2;
  _LT__EQ_.cljs$lang$arity$variadic = _LT__EQ___3.cljs$lang$arity$variadic;
  return _LT__EQ_
}();
cljs.core._GT_ = function() {
  var _GT_ = null;
  var _GT___1 = function(x) {
    return true
  };
  var _GT___2 = function(x, y) {
    return x > y
  };
  var _GT___3 = function() {
    var G__7194__delegate = function(x, y, more) {
      while(true) {
        if(x > y) {
          if(cljs.core.next.call(null, more)) {
            var G__7195 = y;
            var G__7196 = cljs.core.first.call(null, more);
            var G__7197 = cljs.core.next.call(null, more);
            x = G__7195;
            y = G__7196;
            more = G__7197;
            continue
          }else {
            return y > cljs.core.first.call(null, more)
          }
        }else {
          return false
        }
        break
      }
    };
    var G__7194 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7194__delegate.call(this, x, y, more)
    };
    G__7194.cljs$lang$maxFixedArity = 2;
    G__7194.cljs$lang$applyTo = function(arglist__7198) {
      var x = cljs.core.first(arglist__7198);
      var y = cljs.core.first(cljs.core.next(arglist__7198));
      var more = cljs.core.rest(cljs.core.next(arglist__7198));
      return G__7194__delegate(x, y, more)
    };
    G__7194.cljs$lang$arity$variadic = G__7194__delegate;
    return G__7194
  }();
  _GT_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _GT___1.call(this, x);
      case 2:
        return _GT___2.call(this, x, y);
      default:
        return _GT___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _GT_.cljs$lang$maxFixedArity = 2;
  _GT_.cljs$lang$applyTo = _GT___3.cljs$lang$applyTo;
  _GT_.cljs$lang$arity$1 = _GT___1;
  _GT_.cljs$lang$arity$2 = _GT___2;
  _GT_.cljs$lang$arity$variadic = _GT___3.cljs$lang$arity$variadic;
  return _GT_
}();
cljs.core._GT__EQ_ = function() {
  var _GT__EQ_ = null;
  var _GT__EQ___1 = function(x) {
    return true
  };
  var _GT__EQ___2 = function(x, y) {
    return x >= y
  };
  var _GT__EQ___3 = function() {
    var G__7199__delegate = function(x, y, more) {
      while(true) {
        if(x >= y) {
          if(cljs.core.next.call(null, more)) {
            var G__7200 = y;
            var G__7201 = cljs.core.first.call(null, more);
            var G__7202 = cljs.core.next.call(null, more);
            x = G__7200;
            y = G__7201;
            more = G__7202;
            continue
          }else {
            return y >= cljs.core.first.call(null, more)
          }
        }else {
          return false
        }
        break
      }
    };
    var G__7199 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7199__delegate.call(this, x, y, more)
    };
    G__7199.cljs$lang$maxFixedArity = 2;
    G__7199.cljs$lang$applyTo = function(arglist__7203) {
      var x = cljs.core.first(arglist__7203);
      var y = cljs.core.first(cljs.core.next(arglist__7203));
      var more = cljs.core.rest(cljs.core.next(arglist__7203));
      return G__7199__delegate(x, y, more)
    };
    G__7199.cljs$lang$arity$variadic = G__7199__delegate;
    return G__7199
  }();
  _GT__EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _GT__EQ___1.call(this, x);
      case 2:
        return _GT__EQ___2.call(this, x, y);
      default:
        return _GT__EQ___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _GT__EQ_.cljs$lang$maxFixedArity = 2;
  _GT__EQ_.cljs$lang$applyTo = _GT__EQ___3.cljs$lang$applyTo;
  _GT__EQ_.cljs$lang$arity$1 = _GT__EQ___1;
  _GT__EQ_.cljs$lang$arity$2 = _GT__EQ___2;
  _GT__EQ_.cljs$lang$arity$variadic = _GT__EQ___3.cljs$lang$arity$variadic;
  return _GT__EQ_
}();
cljs.core.dec = function dec(x) {
  return x - 1
};
cljs.core.max = function() {
  var max = null;
  var max__1 = function(x) {
    return x
  };
  var max__2 = function(x, y) {
    return x > y ? x : y
  };
  var max__3 = function() {
    var G__7204__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, max, x > y ? x : y, more)
    };
    var G__7204 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7204__delegate.call(this, x, y, more)
    };
    G__7204.cljs$lang$maxFixedArity = 2;
    G__7204.cljs$lang$applyTo = function(arglist__7205) {
      var x = cljs.core.first(arglist__7205);
      var y = cljs.core.first(cljs.core.next(arglist__7205));
      var more = cljs.core.rest(cljs.core.next(arglist__7205));
      return G__7204__delegate(x, y, more)
    };
    G__7204.cljs$lang$arity$variadic = G__7204__delegate;
    return G__7204
  }();
  max = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return max__1.call(this, x);
      case 2:
        return max__2.call(this, x, y);
      default:
        return max__3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  max.cljs$lang$maxFixedArity = 2;
  max.cljs$lang$applyTo = max__3.cljs$lang$applyTo;
  max.cljs$lang$arity$1 = max__1;
  max.cljs$lang$arity$2 = max__2;
  max.cljs$lang$arity$variadic = max__3.cljs$lang$arity$variadic;
  return max
}();
cljs.core.min = function() {
  var min = null;
  var min__1 = function(x) {
    return x
  };
  var min__2 = function(x, y) {
    return x < y ? x : y
  };
  var min__3 = function() {
    var G__7206__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, min, x < y ? x : y, more)
    };
    var G__7206 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7206__delegate.call(this, x, y, more)
    };
    G__7206.cljs$lang$maxFixedArity = 2;
    G__7206.cljs$lang$applyTo = function(arglist__7207) {
      var x = cljs.core.first(arglist__7207);
      var y = cljs.core.first(cljs.core.next(arglist__7207));
      var more = cljs.core.rest(cljs.core.next(arglist__7207));
      return G__7206__delegate(x, y, more)
    };
    G__7206.cljs$lang$arity$variadic = G__7206__delegate;
    return G__7206
  }();
  min = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return min__1.call(this, x);
      case 2:
        return min__2.call(this, x, y);
      default:
        return min__3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  min.cljs$lang$maxFixedArity = 2;
  min.cljs$lang$applyTo = min__3.cljs$lang$applyTo;
  min.cljs$lang$arity$1 = min__1;
  min.cljs$lang$arity$2 = min__2;
  min.cljs$lang$arity$variadic = min__3.cljs$lang$arity$variadic;
  return min
}();
cljs.core.fix = function fix(q) {
  if(q >= 0) {
    return Math.floor.call(null, q)
  }else {
    return Math.ceil.call(null, q)
  }
};
cljs.core.int$ = function int$(x) {
  return cljs.core.fix.call(null, x)
};
cljs.core.long$ = function long$(x) {
  return cljs.core.fix.call(null, x)
};
cljs.core.mod = function mod(n, d) {
  return n % d
};
cljs.core.quot = function quot(n, d) {
  var rem__7209 = n % d;
  return cljs.core.fix.call(null, (n - rem__7209) / d)
};
cljs.core.rem = function rem(n, d) {
  var q__7211 = cljs.core.quot.call(null, n, d);
  return n - d * q__7211
};
cljs.core.rand = function() {
  var rand = null;
  var rand__0 = function() {
    return Math.random.call(null)
  };
  var rand__1 = function(n) {
    return n * rand.call(null)
  };
  rand = function(n) {
    switch(arguments.length) {
      case 0:
        return rand__0.call(this);
      case 1:
        return rand__1.call(this, n)
    }
    throw"Invalid arity: " + arguments.length;
  };
  rand.cljs$lang$arity$0 = rand__0;
  rand.cljs$lang$arity$1 = rand__1;
  return rand
}();
cljs.core.rand_int = function rand_int(n) {
  return cljs.core.fix.call(null, cljs.core.rand.call(null, n))
};
cljs.core.bit_xor = function bit_xor(x, y) {
  return x ^ y
};
cljs.core.bit_and = function bit_and(x, y) {
  return x & y
};
cljs.core.bit_or = function bit_or(x, y) {
  return x | y
};
cljs.core.bit_and_not = function bit_and_not(x, y) {
  return x & ~y
};
cljs.core.bit_clear = function bit_clear(x, n) {
  return x & ~(1 << n)
};
cljs.core.bit_flip = function bit_flip(x, n) {
  return x ^ 1 << n
};
cljs.core.bit_not = function bit_not(x) {
  return~x
};
cljs.core.bit_set = function bit_set(x, n) {
  return x | 1 << n
};
cljs.core.bit_test = function bit_test(x, n) {
  return(x & 1 << n) != 0
};
cljs.core.bit_shift_left = function bit_shift_left(x, n) {
  return x << n
};
cljs.core.bit_shift_right = function bit_shift_right(x, n) {
  return x >> n
};
cljs.core.bit_shift_right_zero_fill = function bit_shift_right_zero_fill(x, n) {
  return x >>> n
};
cljs.core.bit_count = function bit_count(v) {
  var v__7214 = v - (v >> 1 & 1431655765);
  var v__7215 = (v__7214 & 858993459) + (v__7214 >> 2 & 858993459);
  return(v__7215 + (v__7215 >> 4) & 252645135) * 16843009 >> 24
};
cljs.core._EQ__EQ_ = function() {
  var _EQ__EQ_ = null;
  var _EQ__EQ___1 = function(x) {
    return true
  };
  var _EQ__EQ___2 = function(x, y) {
    return cljs.core._equiv.call(null, x, y)
  };
  var _EQ__EQ___3 = function() {
    var G__7216__delegate = function(x, y, more) {
      while(true) {
        if(cljs.core.truth_(_EQ__EQ_.call(null, x, y))) {
          if(cljs.core.next.call(null, more)) {
            var G__7217 = y;
            var G__7218 = cljs.core.first.call(null, more);
            var G__7219 = cljs.core.next.call(null, more);
            x = G__7217;
            y = G__7218;
            more = G__7219;
            continue
          }else {
            return _EQ__EQ_.call(null, y, cljs.core.first.call(null, more))
          }
        }else {
          return false
        }
        break
      }
    };
    var G__7216 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7216__delegate.call(this, x, y, more)
    };
    G__7216.cljs$lang$maxFixedArity = 2;
    G__7216.cljs$lang$applyTo = function(arglist__7220) {
      var x = cljs.core.first(arglist__7220);
      var y = cljs.core.first(cljs.core.next(arglist__7220));
      var more = cljs.core.rest(cljs.core.next(arglist__7220));
      return G__7216__delegate(x, y, more)
    };
    G__7216.cljs$lang$arity$variadic = G__7216__delegate;
    return G__7216
  }();
  _EQ__EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _EQ__EQ___1.call(this, x);
      case 2:
        return _EQ__EQ___2.call(this, x, y);
      default:
        return _EQ__EQ___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  _EQ__EQ_.cljs$lang$maxFixedArity = 2;
  _EQ__EQ_.cljs$lang$applyTo = _EQ__EQ___3.cljs$lang$applyTo;
  _EQ__EQ_.cljs$lang$arity$1 = _EQ__EQ___1;
  _EQ__EQ_.cljs$lang$arity$2 = _EQ__EQ___2;
  _EQ__EQ_.cljs$lang$arity$variadic = _EQ__EQ___3.cljs$lang$arity$variadic;
  return _EQ__EQ_
}();
cljs.core.pos_QMARK_ = function pos_QMARK_(n) {
  return n > 0
};
cljs.core.zero_QMARK_ = function zero_QMARK_(n) {
  return n === 0
};
cljs.core.neg_QMARK_ = function neg_QMARK_(x) {
  return x < 0
};
cljs.core.nthnext = function nthnext(coll, n) {
  var n__7224 = n;
  var xs__7225 = cljs.core.seq.call(null, coll);
  while(true) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____7226 = xs__7225;
      if(and__3822__auto____7226) {
        return n__7224 > 0
      }else {
        return and__3822__auto____7226
      }
    }())) {
      var G__7227 = n__7224 - 1;
      var G__7228 = cljs.core.next.call(null, xs__7225);
      n__7224 = G__7227;
      xs__7225 = G__7228;
      continue
    }else {
      return xs__7225
    }
    break
  }
};
cljs.core.str_STAR_ = function() {
  var str_STAR_ = null;
  var str_STAR___0 = function() {
    return""
  };
  var str_STAR___1 = function(x) {
    if(x == null) {
      return""
    }else {
      if("\ufdd0'else") {
        return x.toString()
      }else {
        return null
      }
    }
  };
  var str_STAR___2 = function() {
    var G__7229__delegate = function(x, ys) {
      return function(sb, more) {
        while(true) {
          if(cljs.core.truth_(more)) {
            var G__7230 = sb.append(str_STAR_.call(null, cljs.core.first.call(null, more)));
            var G__7231 = cljs.core.next.call(null, more);
            sb = G__7230;
            more = G__7231;
            continue
          }else {
            return str_STAR_.call(null, sb)
          }
          break
        }
      }.call(null, new goog.string.StringBuffer(str_STAR_.call(null, x)), ys)
    };
    var G__7229 = function(x, var_args) {
      var ys = null;
      if(goog.isDef(var_args)) {
        ys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
      }
      return G__7229__delegate.call(this, x, ys)
    };
    G__7229.cljs$lang$maxFixedArity = 1;
    G__7229.cljs$lang$applyTo = function(arglist__7232) {
      var x = cljs.core.first(arglist__7232);
      var ys = cljs.core.rest(arglist__7232);
      return G__7229__delegate(x, ys)
    };
    G__7229.cljs$lang$arity$variadic = G__7229__delegate;
    return G__7229
  }();
  str_STAR_ = function(x, var_args) {
    var ys = var_args;
    switch(arguments.length) {
      case 0:
        return str_STAR___0.call(this);
      case 1:
        return str_STAR___1.call(this, x);
      default:
        return str_STAR___2.cljs$lang$arity$variadic(x, cljs.core.array_seq(arguments, 1))
    }
    throw"Invalid arity: " + arguments.length;
  };
  str_STAR_.cljs$lang$maxFixedArity = 1;
  str_STAR_.cljs$lang$applyTo = str_STAR___2.cljs$lang$applyTo;
  str_STAR_.cljs$lang$arity$0 = str_STAR___0;
  str_STAR_.cljs$lang$arity$1 = str_STAR___1;
  str_STAR_.cljs$lang$arity$variadic = str_STAR___2.cljs$lang$arity$variadic;
  return str_STAR_
}();
cljs.core.str = function() {
  var str = null;
  var str__0 = function() {
    return""
  };
  var str__1 = function(x) {
    if(cljs.core.symbol_QMARK_.call(null, x)) {
      return x.substring(2, x.length)
    }else {
      if(cljs.core.keyword_QMARK_.call(null, x)) {
        return cljs.core.str_STAR_.call(null, ":", x.substring(2, x.length))
      }else {
        if(x == null) {
          return""
        }else {
          if("\ufdd0'else") {
            return x.toString()
          }else {
            return null
          }
        }
      }
    }
  };
  var str__2 = function() {
    var G__7233__delegate = function(x, ys) {
      return function(sb, more) {
        while(true) {
          if(cljs.core.truth_(more)) {
            var G__7234 = sb.append(str.call(null, cljs.core.first.call(null, more)));
            var G__7235 = cljs.core.next.call(null, more);
            sb = G__7234;
            more = G__7235;
            continue
          }else {
            return cljs.core.str_STAR_.call(null, sb)
          }
          break
        }
      }.call(null, new goog.string.StringBuffer(str.call(null, x)), ys)
    };
    var G__7233 = function(x, var_args) {
      var ys = null;
      if(goog.isDef(var_args)) {
        ys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
      }
      return G__7233__delegate.call(this, x, ys)
    };
    G__7233.cljs$lang$maxFixedArity = 1;
    G__7233.cljs$lang$applyTo = function(arglist__7236) {
      var x = cljs.core.first(arglist__7236);
      var ys = cljs.core.rest(arglist__7236);
      return G__7233__delegate(x, ys)
    };
    G__7233.cljs$lang$arity$variadic = G__7233__delegate;
    return G__7233
  }();
  str = function(x, var_args) {
    var ys = var_args;
    switch(arguments.length) {
      case 0:
        return str__0.call(this);
      case 1:
        return str__1.call(this, x);
      default:
        return str__2.cljs$lang$arity$variadic(x, cljs.core.array_seq(arguments, 1))
    }
    throw"Invalid arity: " + arguments.length;
  };
  str.cljs$lang$maxFixedArity = 1;
  str.cljs$lang$applyTo = str__2.cljs$lang$applyTo;
  str.cljs$lang$arity$0 = str__0;
  str.cljs$lang$arity$1 = str__1;
  str.cljs$lang$arity$variadic = str__2.cljs$lang$arity$variadic;
  return str
}();
cljs.core.subs = function() {
  var subs = null;
  var subs__2 = function(s, start) {
    return s.substring(start)
  };
  var subs__3 = function(s, start, end) {
    return s.substring(start, end)
  };
  subs = function(s, start, end) {
    switch(arguments.length) {
      case 2:
        return subs__2.call(this, s, start);
      case 3:
        return subs__3.call(this, s, start, end)
    }
    throw"Invalid arity: " + arguments.length;
  };
  subs.cljs$lang$arity$2 = subs__2;
  subs.cljs$lang$arity$3 = subs__3;
  return subs
}();
cljs.core.format = function() {
  var format__delegate = function(fmt, args) {
    return cljs.core.apply.call(null, goog.string.format, fmt, args)
  };
  var format = function(fmt, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return format__delegate.call(this, fmt, args)
  };
  format.cljs$lang$maxFixedArity = 1;
  format.cljs$lang$applyTo = function(arglist__7237) {
    var fmt = cljs.core.first(arglist__7237);
    var args = cljs.core.rest(arglist__7237);
    return format__delegate(fmt, args)
  };
  format.cljs$lang$arity$variadic = format__delegate;
  return format
}();
cljs.core.symbol = function() {
  var symbol = null;
  var symbol__1 = function(name) {
    if(cljs.core.symbol_QMARK_.call(null, name)) {
      name
    }else {
      if(cljs.core.keyword_QMARK_.call(null, name)) {
        cljs.core.str_STAR_.call(null, "\ufdd1", "'", cljs.core.subs.call(null, name, 2))
      }else {
      }
    }
    return cljs.core.str_STAR_.call(null, "\ufdd1", "'", name)
  };
  var symbol__2 = function(ns, name) {
    return symbol.call(null, cljs.core.str_STAR_.call(null, ns, "/", name))
  };
  symbol = function(ns, name) {
    switch(arguments.length) {
      case 1:
        return symbol__1.call(this, ns);
      case 2:
        return symbol__2.call(this, ns, name)
    }
    throw"Invalid arity: " + arguments.length;
  };
  symbol.cljs$lang$arity$1 = symbol__1;
  symbol.cljs$lang$arity$2 = symbol__2;
  return symbol
}();
cljs.core.keyword = function() {
  var keyword = null;
  var keyword__1 = function(name) {
    if(cljs.core.keyword_QMARK_.call(null, name)) {
      return name
    }else {
      if(cljs.core.symbol_QMARK_.call(null, name)) {
        return cljs.core.str_STAR_.call(null, "\ufdd0", "'", cljs.core.subs.call(null, name, 2))
      }else {
        if("\ufdd0'else") {
          return cljs.core.str_STAR_.call(null, "\ufdd0", "'", name)
        }else {
          return null
        }
      }
    }
  };
  var keyword__2 = function(ns, name) {
    return keyword.call(null, cljs.core.str_STAR_.call(null, ns, "/", name))
  };
  keyword = function(ns, name) {
    switch(arguments.length) {
      case 1:
        return keyword__1.call(this, ns);
      case 2:
        return keyword__2.call(this, ns, name)
    }
    throw"Invalid arity: " + arguments.length;
  };
  keyword.cljs$lang$arity$1 = keyword__1;
  keyword.cljs$lang$arity$2 = keyword__2;
  return keyword
}();
cljs.core.equiv_sequential = function equiv_sequential(x, y) {
  return cljs.core.boolean$.call(null, cljs.core.sequential_QMARK_.call(null, y) ? function() {
    var xs__7240 = cljs.core.seq.call(null, x);
    var ys__7241 = cljs.core.seq.call(null, y);
    while(true) {
      if(xs__7240 == null) {
        return ys__7241 == null
      }else {
        if(ys__7241 == null) {
          return false
        }else {
          if(cljs.core._EQ_.call(null, cljs.core.first.call(null, xs__7240), cljs.core.first.call(null, ys__7241))) {
            var G__7242 = cljs.core.next.call(null, xs__7240);
            var G__7243 = cljs.core.next.call(null, ys__7241);
            xs__7240 = G__7242;
            ys__7241 = G__7243;
            continue
          }else {
            if("\ufdd0'else") {
              return false
            }else {
              return null
            }
          }
        }
      }
      break
    }
  }() : null)
};
cljs.core.hash_combine = function hash_combine(seed, hash) {
  return seed ^ hash + 2654435769 + (seed << 6) + (seed >> 2)
};
cljs.core.hash_coll = function hash_coll(coll) {
  return cljs.core.reduce.call(null, function(p1__7244_SHARP_, p2__7245_SHARP_) {
    return cljs.core.hash_combine.call(null, p1__7244_SHARP_, cljs.core.hash.call(null, p2__7245_SHARP_, false))
  }, cljs.core.hash.call(null, cljs.core.first.call(null, coll), false), cljs.core.next.call(null, coll))
};
cljs.core.hash_imap = function hash_imap(m) {
  var h__7249 = 0;
  var s__7250 = cljs.core.seq.call(null, m);
  while(true) {
    if(s__7250) {
      var e__7251 = cljs.core.first.call(null, s__7250);
      var G__7252 = (h__7249 + (cljs.core.hash.call(null, cljs.core.key.call(null, e__7251)) ^ cljs.core.hash.call(null, cljs.core.val.call(null, e__7251)))) % 4503599627370496;
      var G__7253 = cljs.core.next.call(null, s__7250);
      h__7249 = G__7252;
      s__7250 = G__7253;
      continue
    }else {
      return h__7249
    }
    break
  }
};
cljs.core.hash_iset = function hash_iset(s) {
  var h__7257 = 0;
  var s__7258 = cljs.core.seq.call(null, s);
  while(true) {
    if(s__7258) {
      var e__7259 = cljs.core.first.call(null, s__7258);
      var G__7260 = (h__7257 + cljs.core.hash.call(null, e__7259)) % 4503599627370496;
      var G__7261 = cljs.core.next.call(null, s__7258);
      h__7257 = G__7260;
      s__7258 = G__7261;
      continue
    }else {
      return h__7257
    }
    break
  }
};
cljs.core.extend_object_BANG_ = function extend_object_BANG_(obj, fn_map) {
  var G__7282__7283 = cljs.core.seq.call(null, fn_map);
  if(G__7282__7283) {
    var G__7285__7287 = cljs.core.first.call(null, G__7282__7283);
    var vec__7286__7288 = G__7285__7287;
    var key_name__7289 = cljs.core.nth.call(null, vec__7286__7288, 0, null);
    var f__7290 = cljs.core.nth.call(null, vec__7286__7288, 1, null);
    var G__7282__7291 = G__7282__7283;
    var G__7285__7292 = G__7285__7287;
    var G__7282__7293 = G__7282__7291;
    while(true) {
      var vec__7294__7295 = G__7285__7292;
      var key_name__7296 = cljs.core.nth.call(null, vec__7294__7295, 0, null);
      var f__7297 = cljs.core.nth.call(null, vec__7294__7295, 1, null);
      var G__7282__7298 = G__7282__7293;
      var str_name__7299 = cljs.core.name.call(null, key_name__7296);
      obj[str_name__7299] = f__7297;
      var temp__3974__auto____7300 = cljs.core.next.call(null, G__7282__7298);
      if(temp__3974__auto____7300) {
        var G__7282__7301 = temp__3974__auto____7300;
        var G__7302 = cljs.core.first.call(null, G__7282__7301);
        var G__7303 = G__7282__7301;
        G__7285__7292 = G__7302;
        G__7282__7293 = G__7303;
        continue
      }else {
      }
      break
    }
  }else {
  }
  return obj
};
cljs.core.List = function(meta, first, rest, count, __hash) {
  this.meta = meta;
  this.first = first;
  this.rest = rest;
  this.count = count;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 65413358
};
cljs.core.List.cljs$lang$type = true;
cljs.core.List.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/List")
};
cljs.core.List.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__7304 = this;
  var h__2192__auto____7305 = this__7304.__hash;
  if(!(h__2192__auto____7305 == null)) {
    return h__2192__auto____7305
  }else {
    var h__2192__auto____7306 = cljs.core.hash_coll.call(null, coll);
    this__7304.__hash = h__2192__auto____7306;
    return h__2192__auto____7306
  }
};
cljs.core.List.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var this__7307 = this;
  if(this__7307.count === 1) {
    return null
  }else {
    return this__7307.rest
  }
};
cljs.core.List.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__7308 = this;
  return new cljs.core.List(this__7308.meta, o, coll, this__7308.count + 1, null)
};
cljs.core.List.prototype.toString = function() {
  var this__7309 = this;
  var this__7310 = this;
  return cljs.core.pr_str.call(null, this__7310)
};
cljs.core.List.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__7311 = this;
  return coll
};
cljs.core.List.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__7312 = this;
  return this__7312.count
};
cljs.core.List.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var this__7313 = this;
  return this__7313.first
};
cljs.core.List.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var this__7314 = this;
  return coll.cljs$core$ISeq$_rest$arity$1(coll)
};
cljs.core.List.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__7315 = this;
  return this__7315.first
};
cljs.core.List.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__7316 = this;
  if(this__7316.count === 1) {
    return cljs.core.List.EMPTY
  }else {
    return this__7316.rest
  }
};
cljs.core.List.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__7317 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.List.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__7318 = this;
  return new cljs.core.List(meta, this__7318.first, this__7318.rest, this__7318.count, this__7318.__hash)
};
cljs.core.List.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__7319 = this;
  return this__7319.meta
};
cljs.core.List.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__7320 = this;
  return cljs.core.List.EMPTY
};
cljs.core.List;
cljs.core.EmptyList = function(meta) {
  this.meta = meta;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 65413326
};
cljs.core.EmptyList.cljs$lang$type = true;
cljs.core.EmptyList.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/EmptyList")
};
cljs.core.EmptyList.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__7321 = this;
  return 0
};
cljs.core.EmptyList.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var this__7322 = this;
  return null
};
cljs.core.EmptyList.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__7323 = this;
  return new cljs.core.List(this__7323.meta, o, null, 1, null)
};
cljs.core.EmptyList.prototype.toString = function() {
  var this__7324 = this;
  var this__7325 = this;
  return cljs.core.pr_str.call(null, this__7325)
};
cljs.core.EmptyList.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__7326 = this;
  return null
};
cljs.core.EmptyList.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__7327 = this;
  return 0
};
cljs.core.EmptyList.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var this__7328 = this;
  return null
};
cljs.core.EmptyList.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var this__7329 = this;
  throw new Error("Can't pop empty list");
};
cljs.core.EmptyList.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__7330 = this;
  return null
};
cljs.core.EmptyList.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__7331 = this;
  return cljs.core.List.EMPTY
};
cljs.core.EmptyList.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__7332 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.EmptyList.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__7333 = this;
  return new cljs.core.EmptyList(meta)
};
cljs.core.EmptyList.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__7334 = this;
  return this__7334.meta
};
cljs.core.EmptyList.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__7335 = this;
  return coll
};
cljs.core.EmptyList;
cljs.core.List.EMPTY = new cljs.core.EmptyList(null);
cljs.core.reversible_QMARK_ = function reversible_QMARK_(coll) {
  var G__7339__7340 = coll;
  if(G__7339__7340) {
    if(function() {
      var or__3824__auto____7341 = G__7339__7340.cljs$lang$protocol_mask$partition0$ & 134217728;
      if(or__3824__auto____7341) {
        return or__3824__auto____7341
      }else {
        return G__7339__7340.cljs$core$IReversible$
      }
    }()) {
      return true
    }else {
      if(!G__7339__7340.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.IReversible, G__7339__7340)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IReversible, G__7339__7340)
  }
};
cljs.core.rseq = function rseq(coll) {
  return cljs.core._rseq.call(null, coll)
};
cljs.core.reverse = function reverse(coll) {
  if(cljs.core.reversible_QMARK_.call(null, coll)) {
    return cljs.core.rseq.call(null, coll)
  }else {
    return cljs.core.reduce.call(null, cljs.core.conj, cljs.core.List.EMPTY, coll)
  }
};
cljs.core.list = function() {
  var list = null;
  var list__0 = function() {
    return cljs.core.List.EMPTY
  };
  var list__1 = function(x) {
    return cljs.core.conj.call(null, cljs.core.List.EMPTY, x)
  };
  var list__2 = function(x, y) {
    return cljs.core.conj.call(null, list.call(null, y), x)
  };
  var list__3 = function(x, y, z) {
    return cljs.core.conj.call(null, list.call(null, y, z), x)
  };
  var list__4 = function() {
    var G__7342__delegate = function(x, y, z, items) {
      return cljs.core.conj.call(null, cljs.core.conj.call(null, cljs.core.conj.call(null, cljs.core.reduce.call(null, cljs.core.conj, cljs.core.List.EMPTY, cljs.core.reverse.call(null, items)), z), y), x)
    };
    var G__7342 = function(x, y, z, var_args) {
      var items = null;
      if(goog.isDef(var_args)) {
        items = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__7342__delegate.call(this, x, y, z, items)
    };
    G__7342.cljs$lang$maxFixedArity = 3;
    G__7342.cljs$lang$applyTo = function(arglist__7343) {
      var x = cljs.core.first(arglist__7343);
      var y = cljs.core.first(cljs.core.next(arglist__7343));
      var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__7343)));
      var items = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__7343)));
      return G__7342__delegate(x, y, z, items)
    };
    G__7342.cljs$lang$arity$variadic = G__7342__delegate;
    return G__7342
  }();
  list = function(x, y, z, var_args) {
    var items = var_args;
    switch(arguments.length) {
      case 0:
        return list__0.call(this);
      case 1:
        return list__1.call(this, x);
      case 2:
        return list__2.call(this, x, y);
      case 3:
        return list__3.call(this, x, y, z);
      default:
        return list__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
    }
    throw"Invalid arity: " + arguments.length;
  };
  list.cljs$lang$maxFixedArity = 3;
  list.cljs$lang$applyTo = list__4.cljs$lang$applyTo;
  list.cljs$lang$arity$0 = list__0;
  list.cljs$lang$arity$1 = list__1;
  list.cljs$lang$arity$2 = list__2;
  list.cljs$lang$arity$3 = list__3;
  list.cljs$lang$arity$variadic = list__4.cljs$lang$arity$variadic;
  return list
}();
cljs.core.Cons = function(meta, first, rest, __hash) {
  this.meta = meta;
  this.first = first;
  this.rest = rest;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 65405164
};
cljs.core.Cons.cljs$lang$type = true;
cljs.core.Cons.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/Cons")
};
cljs.core.Cons.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__7344 = this;
  var h__2192__auto____7345 = this__7344.__hash;
  if(!(h__2192__auto____7345 == null)) {
    return h__2192__auto____7345
  }else {
    var h__2192__auto____7346 = cljs.core.hash_coll.call(null, coll);
    this__7344.__hash = h__2192__auto____7346;
    return h__2192__auto____7346
  }
};
cljs.core.Cons.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var this__7347 = this;
  if(this__7347.rest == null) {
    return null
  }else {
    return cljs.core._seq.call(null, this__7347.rest)
  }
};
cljs.core.Cons.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__7348 = this;
  return new cljs.core.Cons(null, o, coll, this__7348.__hash)
};
cljs.core.Cons.prototype.toString = function() {
  var this__7349 = this;
  var this__7350 = this;
  return cljs.core.pr_str.call(null, this__7350)
};
cljs.core.Cons.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__7351 = this;
  return coll
};
cljs.core.Cons.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__7352 = this;
  return this__7352.first
};
cljs.core.Cons.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__7353 = this;
  if(this__7353.rest == null) {
    return cljs.core.List.EMPTY
  }else {
    return this__7353.rest
  }
};
cljs.core.Cons.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__7354 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.Cons.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__7355 = this;
  return new cljs.core.Cons(meta, this__7355.first, this__7355.rest, this__7355.__hash)
};
cljs.core.Cons.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__7356 = this;
  return this__7356.meta
};
cljs.core.Cons.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__7357 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__7357.meta)
};
cljs.core.Cons;
cljs.core.cons = function cons(x, coll) {
  if(function() {
    var or__3824__auto____7362 = coll == null;
    if(or__3824__auto____7362) {
      return or__3824__auto____7362
    }else {
      var G__7363__7364 = coll;
      if(G__7363__7364) {
        if(function() {
          var or__3824__auto____7365 = G__7363__7364.cljs$lang$protocol_mask$partition0$ & 64;
          if(or__3824__auto____7365) {
            return or__3824__auto____7365
          }else {
            return G__7363__7364.cljs$core$ISeq$
          }
        }()) {
          return true
        }else {
          if(!G__7363__7364.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.type_satisfies_.call(null, cljs.core.ISeq, G__7363__7364)
          }else {
            return false
          }
        }
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.ISeq, G__7363__7364)
      }
    }
  }()) {
    return new cljs.core.Cons(null, x, coll, null)
  }else {
    return new cljs.core.Cons(null, x, cljs.core.seq.call(null, coll), null)
  }
};
cljs.core.list_QMARK_ = function list_QMARK_(x) {
  var G__7369__7370 = x;
  if(G__7369__7370) {
    if(function() {
      var or__3824__auto____7371 = G__7369__7370.cljs$lang$protocol_mask$partition0$ & 33554432;
      if(or__3824__auto____7371) {
        return or__3824__auto____7371
      }else {
        return G__7369__7370.cljs$core$IList$
      }
    }()) {
      return true
    }else {
      if(!G__7369__7370.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.type_satisfies_.call(null, cljs.core.IList, G__7369__7370)
      }else {
        return false
      }
    }
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IList, G__7369__7370)
  }
};
cljs.core.IReduce["string"] = true;
cljs.core._reduce["string"] = function() {
  var G__7372 = null;
  var G__7372__2 = function(string, f) {
    return cljs.core.ci_reduce.call(null, string, f)
  };
  var G__7372__3 = function(string, f, start) {
    return cljs.core.ci_reduce.call(null, string, f, start)
  };
  G__7372 = function(string, f, start) {
    switch(arguments.length) {
      case 2:
        return G__7372__2.call(this, string, f);
      case 3:
        return G__7372__3.call(this, string, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__7372
}();
cljs.core.ILookup["string"] = true;
cljs.core._lookup["string"] = function() {
  var G__7373 = null;
  var G__7373__2 = function(string, k) {
    return cljs.core._nth.call(null, string, k)
  };
  var G__7373__3 = function(string, k, not_found) {
    return cljs.core._nth.call(null, string, k, not_found)
  };
  G__7373 = function(string, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__7373__2.call(this, string, k);
      case 3:
        return G__7373__3.call(this, string, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__7373
}();
cljs.core.IIndexed["string"] = true;
cljs.core._nth["string"] = function() {
  var G__7374 = null;
  var G__7374__2 = function(string, n) {
    if(n < cljs.core._count.call(null, string)) {
      return string.charAt(n)
    }else {
      return null
    }
  };
  var G__7374__3 = function(string, n, not_found) {
    if(n < cljs.core._count.call(null, string)) {
      return string.charAt(n)
    }else {
      return not_found
    }
  };
  G__7374 = function(string, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__7374__2.call(this, string, n);
      case 3:
        return G__7374__3.call(this, string, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__7374
}();
cljs.core.ICounted["string"] = true;
cljs.core._count["string"] = function(s) {
  return s.length
};
cljs.core.ISeqable["string"] = true;
cljs.core._seq["string"] = function(string) {
  return cljs.core.prim_seq.call(null, string, 0)
};
cljs.core.IHash["string"] = true;
cljs.core._hash["string"] = function(o) {
  return goog.string.hashCode(o)
};
cljs.core.Keyword = function(k) {
  this.k = k;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 1
};
cljs.core.Keyword.cljs$lang$type = true;
cljs.core.Keyword.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/Keyword")
};
cljs.core.Keyword.prototype.call = function() {
  var G__7386 = null;
  var G__7386__2 = function(this_sym7377, coll) {
    var this__7379 = this;
    var this_sym7377__7380 = this;
    var ___7381 = this_sym7377__7380;
    if(coll == null) {
      return null
    }else {
      var strobj__7382 = coll.strobj;
      if(strobj__7382 == null) {
        return cljs.core._lookup.call(null, coll, this__7379.k, null)
      }else {
        return strobj__7382[this__7379.k]
      }
    }
  };
  var G__7386__3 = function(this_sym7378, coll, not_found) {
    var this__7379 = this;
    var this_sym7378__7383 = this;
    var ___7384 = this_sym7378__7383;
    if(coll == null) {
      return not_found
    }else {
      return cljs.core._lookup.call(null, coll, this__7379.k, not_found)
    }
  };
  G__7386 = function(this_sym7378, coll, not_found) {
    switch(arguments.length) {
      case 2:
        return G__7386__2.call(this, this_sym7378, coll);
      case 3:
        return G__7386__3.call(this, this_sym7378, coll, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__7386
}();
cljs.core.Keyword.prototype.apply = function(this_sym7375, args7376) {
  var this__7385 = this;
  return this_sym7375.call.apply(this_sym7375, [this_sym7375].concat(args7376.slice()))
};
cljs.core.Keyword;
String.prototype.cljs$core$IFn$ = true;
String.prototype.call = function() {
  var G__7395 = null;
  var G__7395__2 = function(this_sym7389, coll) {
    var this_sym7389__7391 = this;
    var this__7392 = this_sym7389__7391;
    return cljs.core._lookup.call(null, coll, this__7392.toString(), null)
  };
  var G__7395__3 = function(this_sym7390, coll, not_found) {
    var this_sym7390__7393 = this;
    var this__7394 = this_sym7390__7393;
    return cljs.core._lookup.call(null, coll, this__7394.toString(), not_found)
  };
  G__7395 = function(this_sym7390, coll, not_found) {
    switch(arguments.length) {
      case 2:
        return G__7395__2.call(this, this_sym7390, coll);
      case 3:
        return G__7395__3.call(this, this_sym7390, coll, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__7395
}();
String.prototype.apply = function(this_sym7387, args7388) {
  return this_sym7387.call.apply(this_sym7387, [this_sym7387].concat(args7388.slice()))
};
String.prototype.apply = function(s, args) {
  if(cljs.core.count.call(null, args) < 2) {
    return cljs.core._lookup.call(null, args[0], s, null)
  }else {
    return cljs.core._lookup.call(null, args[0], s, args[1])
  }
};
cljs.core.lazy_seq_value = function lazy_seq_value(lazy_seq) {
  var x__7397 = lazy_seq.x;
  if(lazy_seq.realized) {
    return x__7397
  }else {
    lazy_seq.x = x__7397.call(null);
    lazy_seq.realized = true;
    return lazy_seq.x
  }
};
cljs.core.LazySeq = function(meta, realized, x, __hash) {
  this.meta = meta;
  this.realized = realized;
  this.x = x;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 31850700
};
cljs.core.LazySeq.cljs$lang$type = true;
cljs.core.LazySeq.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/LazySeq")
};
cljs.core.LazySeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__7398 = this;
  var h__2192__auto____7399 = this__7398.__hash;
  if(!(h__2192__auto____7399 == null)) {
    return h__2192__auto____7399
  }else {
    var h__2192__auto____7400 = cljs.core.hash_coll.call(null, coll);
    this__7398.__hash = h__2192__auto____7400;
    return h__2192__auto____7400
  }
};
cljs.core.LazySeq.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var this__7401 = this;
  return cljs.core._seq.call(null, coll.cljs$core$ISeq$_rest$arity$1(coll))
};
cljs.core.LazySeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__7402 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.LazySeq.prototype.toString = function() {
  var this__7403 = this;
  var this__7404 = this;
  return cljs.core.pr_str.call(null, this__7404)
};
cljs.core.LazySeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__7405 = this;
  return cljs.core.seq.call(null, cljs.core.lazy_seq_value.call(null, coll))
};
cljs.core.LazySeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__7406 = this;
  return cljs.core.first.call(null, cljs.core.lazy_seq_value.call(null, coll))
};
cljs.core.LazySeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__7407 = this;
  return cljs.core.rest.call(null, cljs.core.lazy_seq_value.call(null, coll))
};
cljs.core.LazySeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__7408 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.LazySeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__7409 = this;
  return new cljs.core.LazySeq(meta, this__7409.realized, this__7409.x, this__7409.__hash)
};
cljs.core.LazySeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__7410 = this;
  return this__7410.meta
};
cljs.core.LazySeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__7411 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__7411.meta)
};
cljs.core.LazySeq;
cljs.core.ChunkBuffer = function(buf, end) {
  this.buf = buf;
  this.end = end;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 2
};
cljs.core.ChunkBuffer.cljs$lang$type = true;
cljs.core.ChunkBuffer.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/ChunkBuffer")
};
cljs.core.ChunkBuffer.prototype.cljs$core$ICounted$_count$arity$1 = function(_) {
  var this__7412 = this;
  return this__7412.end
};
cljs.core.ChunkBuffer.prototype.add = function(o) {
  var this__7413 = this;
  var ___7414 = this;
  this__7413.buf[this__7413.end] = o;
  return this__7413.end = this__7413.end + 1
};
cljs.core.ChunkBuffer.prototype.chunk = function(o) {
  var this__7415 = this;
  var ___7416 = this;
  var ret__7417 = new cljs.core.ArrayChunk(this__7415.buf, 0, this__7415.end);
  this__7415.buf = null;
  return ret__7417
};
cljs.core.ChunkBuffer;
cljs.core.chunk_buffer = function chunk_buffer(capacity) {
  return new cljs.core.ChunkBuffer(cljs.core.make_array.call(null, capacity), 0)
};
cljs.core.ArrayChunk = function(arr, off, end) {
  this.arr = arr;
  this.off = off;
  this.end = end;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 524306
};
cljs.core.ArrayChunk.cljs$lang$type = true;
cljs.core.ArrayChunk.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/ArrayChunk")
};
cljs.core.ArrayChunk.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var this__7418 = this;
  return cljs.core.ci_reduce.call(null, coll, f, this__7418.arr[this__7418.off], this__7418.off + 1)
};
cljs.core.ArrayChunk.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var this__7419 = this;
  return cljs.core.ci_reduce.call(null, coll, f, start, this__7419.off)
};
cljs.core.ArrayChunk.prototype.cljs$core$IChunk$ = true;
cljs.core.ArrayChunk.prototype.cljs$core$IChunk$_drop_first$arity$1 = function(coll) {
  var this__7420 = this;
  if(this__7420.off === this__7420.end) {
    throw new Error("-drop-first of empty chunk");
  }else {
    return new cljs.core.ArrayChunk(this__7420.arr, this__7420.off + 1, this__7420.end)
  }
};
cljs.core.ArrayChunk.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, i) {
  var this__7421 = this;
  return this__7421.arr[this__7421.off + i]
};
cljs.core.ArrayChunk.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, i, not_found) {
  var this__7422 = this;
  if(function() {
    var and__3822__auto____7423 = i >= 0;
    if(and__3822__auto____7423) {
      return i < this__7422.end - this__7422.off
    }else {
      return and__3822__auto____7423
    }
  }()) {
    return this__7422.arr[this__7422.off + i]
  }else {
    return not_found
  }
};
cljs.core.ArrayChunk.prototype.cljs$core$ICounted$_count$arity$1 = function(_) {
  var this__7424 = this;
  return this__7424.end - this__7424.off
};
cljs.core.ArrayChunk;
cljs.core.array_chunk = function() {
  var array_chunk = null;
  var array_chunk__1 = function(arr) {
    return array_chunk.call(null, arr, 0, arr.length)
  };
  var array_chunk__2 = function(arr, off) {
    return array_chunk.call(null, arr, off, arr.length)
  };
  var array_chunk__3 = function(arr, off, end) {
    return new cljs.core.ArrayChunk(arr, off, end)
  };
  array_chunk = function(arr, off, end) {
    switch(arguments.length) {
      case 1:
        return array_chunk__1.call(this, arr);
      case 2:
        return array_chunk__2.call(this, arr, off);
      case 3:
        return array_chunk__3.call(this, arr, off, end)
    }
    throw"Invalid arity: " + arguments.length;
  };
  array_chunk.cljs$lang$arity$1 = array_chunk__1;
  array_chunk.cljs$lang$arity$2 = array_chunk__2;
  array_chunk.cljs$lang$arity$3 = array_chunk__3;
  return array_chunk
}();
cljs.core.ChunkedCons = function(chunk, more, meta) {
  this.chunk = chunk;
  this.more = more;
  this.meta = meta;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 27656296
};
cljs.core.ChunkedCons.cljs$lang$type = true;
cljs.core.ChunkedCons.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/ChunkedCons")
};
cljs.core.ChunkedCons.prototype.cljs$core$ICollection$_conj$arity$2 = function(this$, o) {
  var this__7425 = this;
  return cljs.core.cons.call(null, o, this$)
};
cljs.core.ChunkedCons.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__7426 = this;
  return coll
};
cljs.core.ChunkedCons.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__7427 = this;
  return cljs.core._nth.call(null, this__7427.chunk, 0)
};
cljs.core.ChunkedCons.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__7428 = this;
  if(cljs.core._count.call(null, this__7428.chunk) > 1) {
    return new cljs.core.ChunkedCons(cljs.core._drop_first.call(null, this__7428.chunk), this__7428.more, this__7428.meta)
  }else {
    if(this__7428.more == null) {
      return cljs.core.List.EMPTY
    }else {
      return this__7428.more
    }
  }
};
cljs.core.ChunkedCons.prototype.cljs$core$IChunkedNext$ = true;
cljs.core.ChunkedCons.prototype.cljs$core$IChunkedNext$_chunked_next$arity$1 = function(coll) {
  var this__7429 = this;
  if(this__7429.more == null) {
    return null
  }else {
    return this__7429.more
  }
};
cljs.core.ChunkedCons.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__7430 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.ChunkedCons.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, m) {
  var this__7431 = this;
  return new cljs.core.ChunkedCons(this__7431.chunk, this__7431.more, m)
};
cljs.core.ChunkedCons.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__7432 = this;
  return this__7432.meta
};
cljs.core.ChunkedCons.prototype.cljs$core$IChunkedSeq$ = true;
cljs.core.ChunkedCons.prototype.cljs$core$IChunkedSeq$_chunked_first$arity$1 = function(coll) {
  var this__7433 = this;
  return this__7433.chunk
};
cljs.core.ChunkedCons.prototype.cljs$core$IChunkedSeq$_chunked_rest$arity$1 = function(coll) {
  var this__7434 = this;
  if(this__7434.more == null) {
    return cljs.core.List.EMPTY
  }else {
    return this__7434.more
  }
};
cljs.core.ChunkedCons;
cljs.core.chunk_cons = function chunk_cons(chunk, rest) {
  if(cljs.core._count.call(null, chunk) === 0) {
    return rest
  }else {
    return new cljs.core.ChunkedCons(chunk, rest, null)
  }
};
cljs.core.chunk_append = function chunk_append(b, x) {
  return b.add(x)
};
cljs.core.chunk = function chunk(b) {
  return b.chunk()
};
cljs.core.chunk_first = function chunk_first(s) {
  return cljs.core._chunked_first.call(null, s)
};
cljs.core.chunk_rest = function chunk_rest(s) {
  return cljs.core._chunked_rest.call(null, s)
};
cljs.core.chunk_next = function chunk_next(s) {
  if(function() {
    var G__7438__7439 = s;
    if(G__7438__7439) {
      if(cljs.core.truth_(function() {
        var or__3824__auto____7440 = null;
        if(cljs.core.truth_(or__3824__auto____7440)) {
          return or__3824__auto____7440
        }else {
          return G__7438__7439.cljs$core$IChunkedNext$
        }
      }())) {
        return true
      }else {
        if(!G__7438__7439.cljs$lang$protocol_mask$partition$) {
          return cljs.core.type_satisfies_.call(null, cljs.core.IChunkedNext, G__7438__7439)
        }else {
          return false
        }
      }
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.IChunkedNext, G__7438__7439)
    }
  }()) {
    return cljs.core._chunked_next.call(null, s)
  }else {
    return cljs.core.seq.call(null, cljs.core._chunked_rest.call(null, s))
  }
};
cljs.core.to_array = function to_array(s) {
  var ary__7443 = [];
  var s__7444 = s;
  while(true) {
    if(cljs.core.seq.call(null, s__7444)) {
      ary__7443.push(cljs.core.first.call(null, s__7444));
      var G__7445 = cljs.core.next.call(null, s__7444);
      s__7444 = G__7445;
      continue
    }else {
      return ary__7443
    }
    break
  }
};
cljs.core.to_array_2d = function to_array_2d(coll) {
  var ret__7449 = cljs.core.make_array.call(null, cljs.core.count.call(null, coll));
  var i__7450 = 0;
  var xs__7451 = cljs.core.seq.call(null, coll);
  while(true) {
    if(xs__7451) {
      ret__7449[i__7450] = cljs.core.to_array.call(null, cljs.core.first.call(null, xs__7451));
      var G__7452 = i__7450 + 1;
      var G__7453 = cljs.core.next.call(null, xs__7451);
      i__7450 = G__7452;
      xs__7451 = G__7453;
      continue
    }else {
    }
    break
  }
  return ret__7449
};
cljs.core.long_array = function() {
  var long_array = null;
  var long_array__1 = function(size_or_seq) {
    if(cljs.core.number_QMARK_.call(null, size_or_seq)) {
      return long_array.call(null, size_or_seq, null)
    }else {
      if(cljs.core.seq_QMARK_.call(null, size_or_seq)) {
        return cljs.core.into_array.call(null, size_or_seq)
      }else {
        if("\ufdd0'else") {
          throw new Error("long-array called with something other than size or ISeq");
        }else {
          return null
        }
      }
    }
  };
  var long_array__2 = function(size, init_val_or_seq) {
    var a__7461 = cljs.core.make_array.call(null, size);
    if(cljs.core.seq_QMARK_.call(null, init_val_or_seq)) {
      var s__7462 = cljs.core.seq.call(null, init_val_or_seq);
      var i__7463 = 0;
      var s__7464 = s__7462;
      while(true) {
        if(cljs.core.truth_(function() {
          var and__3822__auto____7465 = s__7464;
          if(and__3822__auto____7465) {
            return i__7463 < size
          }else {
            return and__3822__auto____7465
          }
        }())) {
          a__7461[i__7463] = cljs.core.first.call(null, s__7464);
          var G__7468 = i__7463 + 1;
          var G__7469 = cljs.core.next.call(null, s__7464);
          i__7463 = G__7468;
          s__7464 = G__7469;
          continue
        }else {
          return a__7461
        }
        break
      }
    }else {
      var n__2527__auto____7466 = size;
      var i__7467 = 0;
      while(true) {
        if(i__7467 < n__2527__auto____7466) {
          a__7461[i__7467] = init_val_or_seq;
          var G__7470 = i__7467 + 1;
          i__7467 = G__7470;
          continue
        }else {
        }
        break
      }
      return a__7461
    }
  };
  long_array = function(size, init_val_or_seq) {
    switch(arguments.length) {
      case 1:
        return long_array__1.call(this, size);
      case 2:
        return long_array__2.call(this, size, init_val_or_seq)
    }
    throw"Invalid arity: " + arguments.length;
  };
  long_array.cljs$lang$arity$1 = long_array__1;
  long_array.cljs$lang$arity$2 = long_array__2;
  return long_array
}();
cljs.core.double_array = function() {
  var double_array = null;
  var double_array__1 = function(size_or_seq) {
    if(cljs.core.number_QMARK_.call(null, size_or_seq)) {
      return double_array.call(null, size_or_seq, null)
    }else {
      if(cljs.core.seq_QMARK_.call(null, size_or_seq)) {
        return cljs.core.into_array.call(null, size_or_seq)
      }else {
        if("\ufdd0'else") {
          throw new Error("double-array called with something other than size or ISeq");
        }else {
          return null
        }
      }
    }
  };
  var double_array__2 = function(size, init_val_or_seq) {
    var a__7478 = cljs.core.make_array.call(null, size);
    if(cljs.core.seq_QMARK_.call(null, init_val_or_seq)) {
      var s__7479 = cljs.core.seq.call(null, init_val_or_seq);
      var i__7480 = 0;
      var s__7481 = s__7479;
      while(true) {
        if(cljs.core.truth_(function() {
          var and__3822__auto____7482 = s__7481;
          if(and__3822__auto____7482) {
            return i__7480 < size
          }else {
            return and__3822__auto____7482
          }
        }())) {
          a__7478[i__7480] = cljs.core.first.call(null, s__7481);
          var G__7485 = i__7480 + 1;
          var G__7486 = cljs.core.next.call(null, s__7481);
          i__7480 = G__7485;
          s__7481 = G__7486;
          continue
        }else {
          return a__7478
        }
        break
      }
    }else {
      var n__2527__auto____7483 = size;
      var i__7484 = 0;
      while(true) {
        if(i__7484 < n__2527__auto____7483) {
          a__7478[i__7484] = init_val_or_seq;
          var G__7487 = i__7484 + 1;
          i__7484 = G__7487;
          continue
        }else {
        }
        break
      }
      return a__7478
    }
  };
  double_array = function(size, init_val_or_seq) {
    switch(arguments.length) {
      case 1:
        return double_array__1.call(this, size);
      case 2:
        return double_array__2.call(this, size, init_val_or_seq)
    }
    throw"Invalid arity: " + arguments.length;
  };
  double_array.cljs$lang$arity$1 = double_array__1;
  double_array.cljs$lang$arity$2 = double_array__2;
  return double_array
}();
cljs.core.object_array = function() {
  var object_array = null;
  var object_array__1 = function(size_or_seq) {
    if(cljs.core.number_QMARK_.call(null, size_or_seq)) {
      return object_array.call(null, size_or_seq, null)
    }else {
      if(cljs.core.seq_QMARK_.call(null, size_or_seq)) {
        return cljs.core.into_array.call(null, size_or_seq)
      }else {
        if("\ufdd0'else") {
          throw new Error("object-array called with something other than size or ISeq");
        }else {
          return null
        }
      }
    }
  };
  var object_array__2 = function(size, init_val_or_seq) {
    var a__7495 = cljs.core.make_array.call(null, size);
    if(cljs.core.seq_QMARK_.call(null, init_val_or_seq)) {
      var s__7496 = cljs.core.seq.call(null, init_val_or_seq);
      var i__7497 = 0;
      var s__7498 = s__7496;
      while(true) {
        if(cljs.core.truth_(function() {
          var and__3822__auto____7499 = s__7498;
          if(and__3822__auto____7499) {
            return i__7497 < size
          }else {
            return and__3822__auto____7499
          }
        }())) {
          a__7495[i__7497] = cljs.core.first.call(null, s__7498);
          var G__7502 = i__7497 + 1;
          var G__7503 = cljs.core.next.call(null, s__7498);
          i__7497 = G__7502;
          s__7498 = G__7503;
          continue
        }else {
          return a__7495
        }
        break
      }
    }else {
      var n__2527__auto____7500 = size;
      var i__7501 = 0;
      while(true) {
        if(i__7501 < n__2527__auto____7500) {
          a__7495[i__7501] = init_val_or_seq;
          var G__7504 = i__7501 + 1;
          i__7501 = G__7504;
          continue
        }else {
        }
        break
      }
      return a__7495
    }
  };
  object_array = function(size, init_val_or_seq) {
    switch(arguments.length) {
      case 1:
        return object_array__1.call(this, size);
      case 2:
        return object_array__2.call(this, size, init_val_or_seq)
    }
    throw"Invalid arity: " + arguments.length;
  };
  object_array.cljs$lang$arity$1 = object_array__1;
  object_array.cljs$lang$arity$2 = object_array__2;
  return object_array
}();
cljs.core.bounded_count = function bounded_count(s, n) {
  if(cljs.core.counted_QMARK_.call(null, s)) {
    return cljs.core.count.call(null, s)
  }else {
    var s__7509 = s;
    var i__7510 = n;
    var sum__7511 = 0;
    while(true) {
      if(cljs.core.truth_(function() {
        var and__3822__auto____7512 = i__7510 > 0;
        if(and__3822__auto____7512) {
          return cljs.core.seq.call(null, s__7509)
        }else {
          return and__3822__auto____7512
        }
      }())) {
        var G__7513 = cljs.core.next.call(null, s__7509);
        var G__7514 = i__7510 - 1;
        var G__7515 = sum__7511 + 1;
        s__7509 = G__7513;
        i__7510 = G__7514;
        sum__7511 = G__7515;
        continue
      }else {
        return sum__7511
      }
      break
    }
  }
};
cljs.core.spread = function spread(arglist) {
  if(arglist == null) {
    return null
  }else {
    if(cljs.core.next.call(null, arglist) == null) {
      return cljs.core.seq.call(null, cljs.core.first.call(null, arglist))
    }else {
      if("\ufdd0'else") {
        return cljs.core.cons.call(null, cljs.core.first.call(null, arglist), spread.call(null, cljs.core.next.call(null, arglist)))
      }else {
        return null
      }
    }
  }
};
cljs.core.concat = function() {
  var concat = null;
  var concat__0 = function() {
    return new cljs.core.LazySeq(null, false, function() {
      return null
    }, null)
  };
  var concat__1 = function(x) {
    return new cljs.core.LazySeq(null, false, function() {
      return x
    }, null)
  };
  var concat__2 = function(x, y) {
    return new cljs.core.LazySeq(null, false, function() {
      var s__7520 = cljs.core.seq.call(null, x);
      if(s__7520) {
        if(cljs.core.chunked_seq_QMARK_.call(null, s__7520)) {
          return cljs.core.chunk_cons.call(null, cljs.core.chunk_first.call(null, s__7520), concat.call(null, cljs.core.chunk_rest.call(null, s__7520), y))
        }else {
          return cljs.core.cons.call(null, cljs.core.first.call(null, s__7520), concat.call(null, cljs.core.rest.call(null, s__7520), y))
        }
      }else {
        return y
      }
    }, null)
  };
  var concat__3 = function() {
    var G__7524__delegate = function(x, y, zs) {
      var cat__7523 = function cat(xys, zs) {
        return new cljs.core.LazySeq(null, false, function() {
          var xys__7522 = cljs.core.seq.call(null, xys);
          if(xys__7522) {
            if(cljs.core.chunked_seq_QMARK_.call(null, xys__7522)) {
              return cljs.core.chunk_cons.call(null, cljs.core.chunk_first.call(null, xys__7522), cat.call(null, cljs.core.chunk_rest.call(null, xys__7522), zs))
            }else {
              return cljs.core.cons.call(null, cljs.core.first.call(null, xys__7522), cat.call(null, cljs.core.rest.call(null, xys__7522), zs))
            }
          }else {
            if(cljs.core.truth_(zs)) {
              return cat.call(null, cljs.core.first.call(null, zs), cljs.core.next.call(null, zs))
            }else {
              return null
            }
          }
        }, null)
      };
      return cat__7523.call(null, concat.call(null, x, y), zs)
    };
    var G__7524 = function(x, y, var_args) {
      var zs = null;
      if(goog.isDef(var_args)) {
        zs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7524__delegate.call(this, x, y, zs)
    };
    G__7524.cljs$lang$maxFixedArity = 2;
    G__7524.cljs$lang$applyTo = function(arglist__7525) {
      var x = cljs.core.first(arglist__7525);
      var y = cljs.core.first(cljs.core.next(arglist__7525));
      var zs = cljs.core.rest(cljs.core.next(arglist__7525));
      return G__7524__delegate(x, y, zs)
    };
    G__7524.cljs$lang$arity$variadic = G__7524__delegate;
    return G__7524
  }();
  concat = function(x, y, var_args) {
    var zs = var_args;
    switch(arguments.length) {
      case 0:
        return concat__0.call(this);
      case 1:
        return concat__1.call(this, x);
      case 2:
        return concat__2.call(this, x, y);
      default:
        return concat__3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  concat.cljs$lang$maxFixedArity = 2;
  concat.cljs$lang$applyTo = concat__3.cljs$lang$applyTo;
  concat.cljs$lang$arity$0 = concat__0;
  concat.cljs$lang$arity$1 = concat__1;
  concat.cljs$lang$arity$2 = concat__2;
  concat.cljs$lang$arity$variadic = concat__3.cljs$lang$arity$variadic;
  return concat
}();
cljs.core.list_STAR_ = function() {
  var list_STAR_ = null;
  var list_STAR___1 = function(args) {
    return cljs.core.seq.call(null, args)
  };
  var list_STAR___2 = function(a, args) {
    return cljs.core.cons.call(null, a, args)
  };
  var list_STAR___3 = function(a, b, args) {
    return cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, args))
  };
  var list_STAR___4 = function(a, b, c, args) {
    return cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, cljs.core.cons.call(null, c, args)))
  };
  var list_STAR___5 = function() {
    var G__7526__delegate = function(a, b, c, d, more) {
      return cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, cljs.core.cons.call(null, c, cljs.core.cons.call(null, d, cljs.core.spread.call(null, more)))))
    };
    var G__7526 = function(a, b, c, d, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 4), 0)
      }
      return G__7526__delegate.call(this, a, b, c, d, more)
    };
    G__7526.cljs$lang$maxFixedArity = 4;
    G__7526.cljs$lang$applyTo = function(arglist__7527) {
      var a = cljs.core.first(arglist__7527);
      var b = cljs.core.first(cljs.core.next(arglist__7527));
      var c = cljs.core.first(cljs.core.next(cljs.core.next(arglist__7527)));
      var d = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__7527))));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(arglist__7527))));
      return G__7526__delegate(a, b, c, d, more)
    };
    G__7526.cljs$lang$arity$variadic = G__7526__delegate;
    return G__7526
  }();
  list_STAR_ = function(a, b, c, d, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return list_STAR___1.call(this, a);
      case 2:
        return list_STAR___2.call(this, a, b);
      case 3:
        return list_STAR___3.call(this, a, b, c);
      case 4:
        return list_STAR___4.call(this, a, b, c, d);
      default:
        return list_STAR___5.cljs$lang$arity$variadic(a, b, c, d, cljs.core.array_seq(arguments, 4))
    }
    throw"Invalid arity: " + arguments.length;
  };
  list_STAR_.cljs$lang$maxFixedArity = 4;
  list_STAR_.cljs$lang$applyTo = list_STAR___5.cljs$lang$applyTo;
  list_STAR_.cljs$lang$arity$1 = list_STAR___1;
  list_STAR_.cljs$lang$arity$2 = list_STAR___2;
  list_STAR_.cljs$lang$arity$3 = list_STAR___3;
  list_STAR_.cljs$lang$arity$4 = list_STAR___4;
  list_STAR_.cljs$lang$arity$variadic = list_STAR___5.cljs$lang$arity$variadic;
  return list_STAR_
}();
cljs.core.transient$ = function transient$(coll) {
  return cljs.core._as_transient.call(null, coll)
};
cljs.core.persistent_BANG_ = function persistent_BANG_(tcoll) {
  return cljs.core._persistent_BANG_.call(null, tcoll)
};
cljs.core.conj_BANG_ = function conj_BANG_(tcoll, val) {
  return cljs.core._conj_BANG_.call(null, tcoll, val)
};
cljs.core.assoc_BANG_ = function assoc_BANG_(tcoll, key, val) {
  return cljs.core._assoc_BANG_.call(null, tcoll, key, val)
};
cljs.core.dissoc_BANG_ = function dissoc_BANG_(tcoll, key) {
  return cljs.core._dissoc_BANG_.call(null, tcoll, key)
};
cljs.core.pop_BANG_ = function pop_BANG_(tcoll) {
  return cljs.core._pop_BANG_.call(null, tcoll)
};
cljs.core.disj_BANG_ = function disj_BANG_(tcoll, val) {
  return cljs.core._disjoin_BANG_.call(null, tcoll, val)
};
cljs.core.apply_to = function apply_to(f, argc, args) {
  var args__7569 = cljs.core.seq.call(null, args);
  if(argc === 0) {
    return f.call(null)
  }else {
    var a__7570 = cljs.core._first.call(null, args__7569);
    var args__7571 = cljs.core._rest.call(null, args__7569);
    if(argc === 1) {
      if(f.cljs$lang$arity$1) {
        return f.cljs$lang$arity$1(a__7570)
      }else {
        return f.call(null, a__7570)
      }
    }else {
      var b__7572 = cljs.core._first.call(null, args__7571);
      var args__7573 = cljs.core._rest.call(null, args__7571);
      if(argc === 2) {
        if(f.cljs$lang$arity$2) {
          return f.cljs$lang$arity$2(a__7570, b__7572)
        }else {
          return f.call(null, a__7570, b__7572)
        }
      }else {
        var c__7574 = cljs.core._first.call(null, args__7573);
        var args__7575 = cljs.core._rest.call(null, args__7573);
        if(argc === 3) {
          if(f.cljs$lang$arity$3) {
            return f.cljs$lang$arity$3(a__7570, b__7572, c__7574)
          }else {
            return f.call(null, a__7570, b__7572, c__7574)
          }
        }else {
          var d__7576 = cljs.core._first.call(null, args__7575);
          var args__7577 = cljs.core._rest.call(null, args__7575);
          if(argc === 4) {
            if(f.cljs$lang$arity$4) {
              return f.cljs$lang$arity$4(a__7570, b__7572, c__7574, d__7576)
            }else {
              return f.call(null, a__7570, b__7572, c__7574, d__7576)
            }
          }else {
            var e__7578 = cljs.core._first.call(null, args__7577);
            var args__7579 = cljs.core._rest.call(null, args__7577);
            if(argc === 5) {
              if(f.cljs$lang$arity$5) {
                return f.cljs$lang$arity$5(a__7570, b__7572, c__7574, d__7576, e__7578)
              }else {
                return f.call(null, a__7570, b__7572, c__7574, d__7576, e__7578)
              }
            }else {
              var f__7580 = cljs.core._first.call(null, args__7579);
              var args__7581 = cljs.core._rest.call(null, args__7579);
              if(argc === 6) {
                if(f__7580.cljs$lang$arity$6) {
                  return f__7580.cljs$lang$arity$6(a__7570, b__7572, c__7574, d__7576, e__7578, f__7580)
                }else {
                  return f__7580.call(null, a__7570, b__7572, c__7574, d__7576, e__7578, f__7580)
                }
              }else {
                var g__7582 = cljs.core._first.call(null, args__7581);
                var args__7583 = cljs.core._rest.call(null, args__7581);
                if(argc === 7) {
                  if(f__7580.cljs$lang$arity$7) {
                    return f__7580.cljs$lang$arity$7(a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582)
                  }else {
                    return f__7580.call(null, a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582)
                  }
                }else {
                  var h__7584 = cljs.core._first.call(null, args__7583);
                  var args__7585 = cljs.core._rest.call(null, args__7583);
                  if(argc === 8) {
                    if(f__7580.cljs$lang$arity$8) {
                      return f__7580.cljs$lang$arity$8(a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584)
                    }else {
                      return f__7580.call(null, a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584)
                    }
                  }else {
                    var i__7586 = cljs.core._first.call(null, args__7585);
                    var args__7587 = cljs.core._rest.call(null, args__7585);
                    if(argc === 9) {
                      if(f__7580.cljs$lang$arity$9) {
                        return f__7580.cljs$lang$arity$9(a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586)
                      }else {
                        return f__7580.call(null, a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586)
                      }
                    }else {
                      var j__7588 = cljs.core._first.call(null, args__7587);
                      var args__7589 = cljs.core._rest.call(null, args__7587);
                      if(argc === 10) {
                        if(f__7580.cljs$lang$arity$10) {
                          return f__7580.cljs$lang$arity$10(a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588)
                        }else {
                          return f__7580.call(null, a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588)
                        }
                      }else {
                        var k__7590 = cljs.core._first.call(null, args__7589);
                        var args__7591 = cljs.core._rest.call(null, args__7589);
                        if(argc === 11) {
                          if(f__7580.cljs$lang$arity$11) {
                            return f__7580.cljs$lang$arity$11(a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590)
                          }else {
                            return f__7580.call(null, a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590)
                          }
                        }else {
                          var l__7592 = cljs.core._first.call(null, args__7591);
                          var args__7593 = cljs.core._rest.call(null, args__7591);
                          if(argc === 12) {
                            if(f__7580.cljs$lang$arity$12) {
                              return f__7580.cljs$lang$arity$12(a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590, l__7592)
                            }else {
                              return f__7580.call(null, a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590, l__7592)
                            }
                          }else {
                            var m__7594 = cljs.core._first.call(null, args__7593);
                            var args__7595 = cljs.core._rest.call(null, args__7593);
                            if(argc === 13) {
                              if(f__7580.cljs$lang$arity$13) {
                                return f__7580.cljs$lang$arity$13(a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590, l__7592, m__7594)
                              }else {
                                return f__7580.call(null, a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590, l__7592, m__7594)
                              }
                            }else {
                              var n__7596 = cljs.core._first.call(null, args__7595);
                              var args__7597 = cljs.core._rest.call(null, args__7595);
                              if(argc === 14) {
                                if(f__7580.cljs$lang$arity$14) {
                                  return f__7580.cljs$lang$arity$14(a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590, l__7592, m__7594, n__7596)
                                }else {
                                  return f__7580.call(null, a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590, l__7592, m__7594, n__7596)
                                }
                              }else {
                                var o__7598 = cljs.core._first.call(null, args__7597);
                                var args__7599 = cljs.core._rest.call(null, args__7597);
                                if(argc === 15) {
                                  if(f__7580.cljs$lang$arity$15) {
                                    return f__7580.cljs$lang$arity$15(a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590, l__7592, m__7594, n__7596, o__7598)
                                  }else {
                                    return f__7580.call(null, a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590, l__7592, m__7594, n__7596, o__7598)
                                  }
                                }else {
                                  var p__7600 = cljs.core._first.call(null, args__7599);
                                  var args__7601 = cljs.core._rest.call(null, args__7599);
                                  if(argc === 16) {
                                    if(f__7580.cljs$lang$arity$16) {
                                      return f__7580.cljs$lang$arity$16(a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590, l__7592, m__7594, n__7596, o__7598, p__7600)
                                    }else {
                                      return f__7580.call(null, a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590, l__7592, m__7594, n__7596, o__7598, p__7600)
                                    }
                                  }else {
                                    var q__7602 = cljs.core._first.call(null, args__7601);
                                    var args__7603 = cljs.core._rest.call(null, args__7601);
                                    if(argc === 17) {
                                      if(f__7580.cljs$lang$arity$17) {
                                        return f__7580.cljs$lang$arity$17(a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590, l__7592, m__7594, n__7596, o__7598, p__7600, q__7602)
                                      }else {
                                        return f__7580.call(null, a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590, l__7592, m__7594, n__7596, o__7598, p__7600, q__7602)
                                      }
                                    }else {
                                      var r__7604 = cljs.core._first.call(null, args__7603);
                                      var args__7605 = cljs.core._rest.call(null, args__7603);
                                      if(argc === 18) {
                                        if(f__7580.cljs$lang$arity$18) {
                                          return f__7580.cljs$lang$arity$18(a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590, l__7592, m__7594, n__7596, o__7598, p__7600, q__7602, r__7604)
                                        }else {
                                          return f__7580.call(null, a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590, l__7592, m__7594, n__7596, o__7598, p__7600, q__7602, r__7604)
                                        }
                                      }else {
                                        var s__7606 = cljs.core._first.call(null, args__7605);
                                        var args__7607 = cljs.core._rest.call(null, args__7605);
                                        if(argc === 19) {
                                          if(f__7580.cljs$lang$arity$19) {
                                            return f__7580.cljs$lang$arity$19(a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590, l__7592, m__7594, n__7596, o__7598, p__7600, q__7602, r__7604, s__7606)
                                          }else {
                                            return f__7580.call(null, a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590, l__7592, m__7594, n__7596, o__7598, p__7600, q__7602, r__7604, s__7606)
                                          }
                                        }else {
                                          var t__7608 = cljs.core._first.call(null, args__7607);
                                          var args__7609 = cljs.core._rest.call(null, args__7607);
                                          if(argc === 20) {
                                            if(f__7580.cljs$lang$arity$20) {
                                              return f__7580.cljs$lang$arity$20(a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590, l__7592, m__7594, n__7596, o__7598, p__7600, q__7602, r__7604, s__7606, t__7608)
                                            }else {
                                              return f__7580.call(null, a__7570, b__7572, c__7574, d__7576, e__7578, f__7580, g__7582, h__7584, i__7586, j__7588, k__7590, l__7592, m__7594, n__7596, o__7598, p__7600, q__7602, r__7604, s__7606, t__7608)
                                            }
                                          }else {
                                            throw new Error("Only up to 20 arguments supported on functions");
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
cljs.core.apply = function() {
  var apply = null;
  var apply__2 = function(f, args) {
    var fixed_arity__7624 = f.cljs$lang$maxFixedArity;
    if(cljs.core.truth_(f.cljs$lang$applyTo)) {
      var bc__7625 = cljs.core.bounded_count.call(null, args, fixed_arity__7624 + 1);
      if(bc__7625 <= fixed_arity__7624) {
        return cljs.core.apply_to.call(null, f, bc__7625, args)
      }else {
        return f.cljs$lang$applyTo(args)
      }
    }else {
      return f.apply(f, cljs.core.to_array.call(null, args))
    }
  };
  var apply__3 = function(f, x, args) {
    var arglist__7626 = cljs.core.list_STAR_.call(null, x, args);
    var fixed_arity__7627 = f.cljs$lang$maxFixedArity;
    if(cljs.core.truth_(f.cljs$lang$applyTo)) {
      var bc__7628 = cljs.core.bounded_count.call(null, arglist__7626, fixed_arity__7627 + 1);
      if(bc__7628 <= fixed_arity__7627) {
        return cljs.core.apply_to.call(null, f, bc__7628, arglist__7626)
      }else {
        return f.cljs$lang$applyTo(arglist__7626)
      }
    }else {
      return f.apply(f, cljs.core.to_array.call(null, arglist__7626))
    }
  };
  var apply__4 = function(f, x, y, args) {
    var arglist__7629 = cljs.core.list_STAR_.call(null, x, y, args);
    var fixed_arity__7630 = f.cljs$lang$maxFixedArity;
    if(cljs.core.truth_(f.cljs$lang$applyTo)) {
      var bc__7631 = cljs.core.bounded_count.call(null, arglist__7629, fixed_arity__7630 + 1);
      if(bc__7631 <= fixed_arity__7630) {
        return cljs.core.apply_to.call(null, f, bc__7631, arglist__7629)
      }else {
        return f.cljs$lang$applyTo(arglist__7629)
      }
    }else {
      return f.apply(f, cljs.core.to_array.call(null, arglist__7629))
    }
  };
  var apply__5 = function(f, x, y, z, args) {
    var arglist__7632 = cljs.core.list_STAR_.call(null, x, y, z, args);
    var fixed_arity__7633 = f.cljs$lang$maxFixedArity;
    if(cljs.core.truth_(f.cljs$lang$applyTo)) {
      var bc__7634 = cljs.core.bounded_count.call(null, arglist__7632, fixed_arity__7633 + 1);
      if(bc__7634 <= fixed_arity__7633) {
        return cljs.core.apply_to.call(null, f, bc__7634, arglist__7632)
      }else {
        return f.cljs$lang$applyTo(arglist__7632)
      }
    }else {
      return f.apply(f, cljs.core.to_array.call(null, arglist__7632))
    }
  };
  var apply__6 = function() {
    var G__7638__delegate = function(f, a, b, c, d, args) {
      var arglist__7635 = cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, cljs.core.cons.call(null, c, cljs.core.cons.call(null, d, cljs.core.spread.call(null, args)))));
      var fixed_arity__7636 = f.cljs$lang$maxFixedArity;
      if(cljs.core.truth_(f.cljs$lang$applyTo)) {
        var bc__7637 = cljs.core.bounded_count.call(null, arglist__7635, fixed_arity__7636 + 1);
        if(bc__7637 <= fixed_arity__7636) {
          return cljs.core.apply_to.call(null, f, bc__7637, arglist__7635)
        }else {
          return f.cljs$lang$applyTo(arglist__7635)
        }
      }else {
        return f.apply(f, cljs.core.to_array.call(null, arglist__7635))
      }
    };
    var G__7638 = function(f, a, b, c, d, var_args) {
      var args = null;
      if(goog.isDef(var_args)) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 5), 0)
      }
      return G__7638__delegate.call(this, f, a, b, c, d, args)
    };
    G__7638.cljs$lang$maxFixedArity = 5;
    G__7638.cljs$lang$applyTo = function(arglist__7639) {
      var f = cljs.core.first(arglist__7639);
      var a = cljs.core.first(cljs.core.next(arglist__7639));
      var b = cljs.core.first(cljs.core.next(cljs.core.next(arglist__7639)));
      var c = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__7639))));
      var d = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__7639)))));
      var args = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__7639)))));
      return G__7638__delegate(f, a, b, c, d, args)
    };
    G__7638.cljs$lang$arity$variadic = G__7638__delegate;
    return G__7638
  }();
  apply = function(f, a, b, c, d, var_args) {
    var args = var_args;
    switch(arguments.length) {
      case 2:
        return apply__2.call(this, f, a);
      case 3:
        return apply__3.call(this, f, a, b);
      case 4:
        return apply__4.call(this, f, a, b, c);
      case 5:
        return apply__5.call(this, f, a, b, c, d);
      default:
        return apply__6.cljs$lang$arity$variadic(f, a, b, c, d, cljs.core.array_seq(arguments, 5))
    }
    throw"Invalid arity: " + arguments.length;
  };
  apply.cljs$lang$maxFixedArity = 5;
  apply.cljs$lang$applyTo = apply__6.cljs$lang$applyTo;
  apply.cljs$lang$arity$2 = apply__2;
  apply.cljs$lang$arity$3 = apply__3;
  apply.cljs$lang$arity$4 = apply__4;
  apply.cljs$lang$arity$5 = apply__5;
  apply.cljs$lang$arity$variadic = apply__6.cljs$lang$arity$variadic;
  return apply
}();
cljs.core.vary_meta = function() {
  var vary_meta__delegate = function(obj, f, args) {
    return cljs.core.with_meta.call(null, obj, cljs.core.apply.call(null, f, cljs.core.meta.call(null, obj), args))
  };
  var vary_meta = function(obj, f, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
    }
    return vary_meta__delegate.call(this, obj, f, args)
  };
  vary_meta.cljs$lang$maxFixedArity = 2;
  vary_meta.cljs$lang$applyTo = function(arglist__7640) {
    var obj = cljs.core.first(arglist__7640);
    var f = cljs.core.first(cljs.core.next(arglist__7640));
    var args = cljs.core.rest(cljs.core.next(arglist__7640));
    return vary_meta__delegate(obj, f, args)
  };
  vary_meta.cljs$lang$arity$variadic = vary_meta__delegate;
  return vary_meta
}();
cljs.core.not_EQ_ = function() {
  var not_EQ_ = null;
  var not_EQ___1 = function(x) {
    return false
  };
  var not_EQ___2 = function(x, y) {
    return!cljs.core._EQ_.call(null, x, y)
  };
  var not_EQ___3 = function() {
    var G__7641__delegate = function(x, y, more) {
      return cljs.core.not.call(null, cljs.core.apply.call(null, cljs.core._EQ_, x, y, more))
    };
    var G__7641 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__7641__delegate.call(this, x, y, more)
    };
    G__7641.cljs$lang$maxFixedArity = 2;
    G__7641.cljs$lang$applyTo = function(arglist__7642) {
      var x = cljs.core.first(arglist__7642);
      var y = cljs.core.first(cljs.core.next(arglist__7642));
      var more = cljs.core.rest(cljs.core.next(arglist__7642));
      return G__7641__delegate(x, y, more)
    };
    G__7641.cljs$lang$arity$variadic = G__7641__delegate;
    return G__7641
  }();
  not_EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return not_EQ___1.call(this, x);
      case 2:
        return not_EQ___2.call(this, x, y);
      default:
        return not_EQ___3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  not_EQ_.cljs$lang$maxFixedArity = 2;
  not_EQ_.cljs$lang$applyTo = not_EQ___3.cljs$lang$applyTo;
  not_EQ_.cljs$lang$arity$1 = not_EQ___1;
  not_EQ_.cljs$lang$arity$2 = not_EQ___2;
  not_EQ_.cljs$lang$arity$variadic = not_EQ___3.cljs$lang$arity$variadic;
  return not_EQ_
}();
cljs.core.not_empty = function not_empty(coll) {
  if(cljs.core.seq.call(null, coll)) {
    return coll
  }else {
    return null
  }
};
cljs.core.every_QMARK_ = function every_QMARK_(pred, coll) {
  while(true) {
    if(cljs.core.seq.call(null, coll) == null) {
      return true
    }else {
      if(cljs.core.truth_(pred.call(null, cljs.core.first.call(null, coll)))) {
        var G__7643 = pred;
        var G__7644 = cljs.core.next.call(null, coll);
        pred = G__7643;
        coll = G__7644;
        continue
      }else {
        if("\ufdd0'else") {
          return false
        }else {
          return null
        }
      }
    }
    break
  }
};
cljs.core.not_every_QMARK_ = function not_every_QMARK_(pred, coll) {
  return!cljs.core.every_QMARK_.call(null, pred, coll)
};
cljs.core.some = function some(pred, coll) {
  while(true) {
    if(cljs.core.seq.call(null, coll)) {
      var or__3824__auto____7646 = pred.call(null, cljs.core.first.call(null, coll));
      if(cljs.core.truth_(or__3824__auto____7646)) {
        return or__3824__auto____7646
      }else {
        var G__7647 = pred;
        var G__7648 = cljs.core.next.call(null, coll);
        pred = G__7647;
        coll = G__7648;
        continue
      }
    }else {
      return null
    }
    break
  }
};
cljs.core.not_any_QMARK_ = function not_any_QMARK_(pred, coll) {
  return cljs.core.not.call(null, cljs.core.some.call(null, pred, coll))
};
cljs.core.even_QMARK_ = function even_QMARK_(n) {
  if(cljs.core.integer_QMARK_.call(null, n)) {
    return(n & 1) === 0
  }else {
    throw new Error([cljs.core.str("Argument must be an integer: "), cljs.core.str(n)].join(""));
  }
};
cljs.core.odd_QMARK_ = function odd_QMARK_(n) {
  return!cljs.core.even_QMARK_.call(null, n)
};
cljs.core.identity = function identity(x) {
  return x
};
cljs.core.complement = function complement(f) {
  return function() {
    var G__7649 = null;
    var G__7649__0 = function() {
      return cljs.core.not.call(null, f.call(null))
    };
    var G__7649__1 = function(x) {
      return cljs.core.not.call(null, f.call(null, x))
    };
    var G__7649__2 = function(x, y) {
      return cljs.core.not.call(null, f.call(null, x, y))
    };
    var G__7649__3 = function() {
      var G__7650__delegate = function(x, y, zs) {
        return cljs.core.not.call(null, cljs.core.apply.call(null, f, x, y, zs))
      };
      var G__7650 = function(x, y, var_args) {
        var zs = null;
        if(goog.isDef(var_args)) {
          zs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
        }
        return G__7650__delegate.call(this, x, y, zs)
      };
      G__7650.cljs$lang$maxFixedArity = 2;
      G__7650.cljs$lang$applyTo = function(arglist__7651) {
        var x = cljs.core.first(arglist__7651);
        var y = cljs.core.first(cljs.core.next(arglist__7651));
        var zs = cljs.core.rest(cljs.core.next(arglist__7651));
        return G__7650__delegate(x, y, zs)
      };
      G__7650.cljs$lang$arity$variadic = G__7650__delegate;
      return G__7650
    }();
    G__7649 = function(x, y, var_args) {
      var zs = var_args;
      switch(arguments.length) {
        case 0:
          return G__7649__0.call(this);
        case 1:
          return G__7649__1.call(this, x);
        case 2:
          return G__7649__2.call(this, x, y);
        default:
          return G__7649__3.cljs$lang$arity$variadic(x, y, cljs.core.array_seq(arguments, 2))
      }
      throw"Invalid arity: " + arguments.length;
    };
    G__7649.cljs$lang$maxFixedArity = 2;
    G__7649.cljs$lang$applyTo = G__7649__3.cljs$lang$applyTo;
    return G__7649
  }()
};
cljs.core.constantly = function constantly(x) {
  return function() {
    var G__7652__delegate = function(args) {
      return x
    };
    var G__7652 = function(var_args) {
      var args = null;
      if(goog.isDef(var_args)) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
      }
      return G__7652__delegate.call(this, args)
    };
    G__7652.cljs$lang$maxFixedArity = 0;
    G__7652.cljs$lang$applyTo = function(arglist__7653) {
      var args = cljs.core.seq(arglist__7653);
      return G__7652__delegate(args)
    };
    G__7652.cljs$lang$arity$variadic = G__7652__delegate;
    return G__7652
  }()
};
cljs.core.comp = function() {
  var comp = null;
  var comp__0 = function() {
    return cljs.core.identity
  };
  var comp__1 = function(f) {
    return f
  };
  var comp__2 = function(f, g) {
    return function() {
      var G__7660 = null;
      var G__7660__0 = function() {
        return f.call(null, g.call(null))
      };
      var G__7660__1 = function(x) {
        return f.call(null, g.call(null, x))
      };
      var G__7660__2 = function(x, y) {
        return f.call(null, g.call(null, x, y))
      };
      var G__7660__3 = function(x, y, z) {
        return f.call(null, g.call(null, x, y, z))
      };
      var G__7660__4 = function() {
        var G__7661__delegate = function(x, y, z, args) {
          return f.call(null, cljs.core.apply.call(null, g, x, y, z, args))
        };
        var G__7661 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__7661__delegate.call(this, x, y, z, args)
        };
        G__7661.cljs$lang$maxFixedArity = 3;
        G__7661.cljs$lang$applyTo = function(arglist__7662) {
          var x = cljs.core.first(arglist__7662);
          var y = cljs.core.first(cljs.core.next(arglist__7662));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__7662)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__7662)));
          return G__7661__delegate(x, y, z, args)
        };
        G__7661.cljs$lang$arity$variadic = G__7661__delegate;
        return G__7661
      }();
      G__7660 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__7660__0.call(this);
          case 1:
            return G__7660__1.call(this, x);
          case 2:
            return G__7660__2.call(this, x, y);
          case 3:
            return G__7660__3.call(this, x, y, z);
          default:
            return G__7660__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__7660.cljs$lang$maxFixedArity = 3;
      G__7660.cljs$lang$applyTo = G__7660__4.cljs$lang$applyTo;
      return G__7660
    }()
  };
  var comp__3 = function(f, g, h) {
    return function() {
      var G__7663 = null;
      var G__7663__0 = function() {
        return f.call(null, g.call(null, h.call(null)))
      };
      var G__7663__1 = function(x) {
        return f.call(null, g.call(null, h.call(null, x)))
      };
      var G__7663__2 = function(x, y) {
        return f.call(null, g.call(null, h.call(null, x, y)))
      };
      var G__7663__3 = function(x, y, z) {
        return f.call(null, g.call(null, h.call(null, x, y, z)))
      };
      var G__7663__4 = function() {
        var G__7664__delegate = function(x, y, z, args) {
          return f.call(null, g.call(null, cljs.core.apply.call(null, h, x, y, z, args)))
        };
        var G__7664 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__7664__delegate.call(this, x, y, z, args)
        };
        G__7664.cljs$lang$maxFixedArity = 3;
        G__7664.cljs$lang$applyTo = function(arglist__7665) {
          var x = cljs.core.first(arglist__7665);
          var y = cljs.core.first(cljs.core.next(arglist__7665));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__7665)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__7665)));
          return G__7664__delegate(x, y, z, args)
        };
        G__7664.cljs$lang$arity$variadic = G__7664__delegate;
        return G__7664
      }();
      G__7663 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__7663__0.call(this);
          case 1:
            return G__7663__1.call(this, x);
          case 2:
            return G__7663__2.call(this, x, y);
          case 3:
            return G__7663__3.call(this, x, y, z);
          default:
            return G__7663__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__7663.cljs$lang$maxFixedArity = 3;
      G__7663.cljs$lang$applyTo = G__7663__4.cljs$lang$applyTo;
      return G__7663
    }()
  };
  var comp__4 = function() {
    var G__7666__delegate = function(f1, f2, f3, fs) {
      var fs__7657 = cljs.core.reverse.call(null, cljs.core.list_STAR_.call(null, f1, f2, f3, fs));
      return function() {
        var G__7667__delegate = function(args) {
          var ret__7658 = cljs.core.apply.call(null, cljs.core.first.call(null, fs__7657), args);
          var fs__7659 = cljs.core.next.call(null, fs__7657);
          while(true) {
            if(fs__7659) {
              var G__7668 = cljs.core.first.call(null, fs__7659).call(null, ret__7658);
              var G__7669 = cljs.core.next.call(null, fs__7659);
              ret__7658 = G__7668;
              fs__7659 = G__7669;
              continue
            }else {
              return ret__7658
            }
            break
          }
        };
        var G__7667 = function(var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
          }
          return G__7667__delegate.call(this, args)
        };
        G__7667.cljs$lang$maxFixedArity = 0;
        G__7667.cljs$lang$applyTo = function(arglist__7670) {
          var args = cljs.core.seq(arglist__7670);
          return G__7667__delegate(args)
        };
        G__7667.cljs$lang$arity$variadic = G__7667__delegate;
        return G__7667
      }()
    };
    var G__7666 = function(f1, f2, f3, var_args) {
      var fs = null;
      if(goog.isDef(var_args)) {
        fs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__7666__delegate.call(this, f1, f2, f3, fs)
    };
    G__7666.cljs$lang$maxFixedArity = 3;
    G__7666.cljs$lang$applyTo = function(arglist__7671) {
      var f1 = cljs.core.first(arglist__7671);
      var f2 = cljs.core.first(cljs.core.next(arglist__7671));
      var f3 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__7671)));
      var fs = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__7671)));
      return G__7666__delegate(f1, f2, f3, fs)
    };
    G__7666.cljs$lang$arity$variadic = G__7666__delegate;
    return G__7666
  }();
  comp = function(f1, f2, f3, var_args) {
    var fs = var_args;
    switch(arguments.length) {
      case 0:
        return comp__0.call(this);
      case 1:
        return comp__1.call(this, f1);
      case 2:
        return comp__2.call(this, f1, f2);
      case 3:
        return comp__3.call(this, f1, f2, f3);
      default:
        return comp__4.cljs$lang$arity$variadic(f1, f2, f3, cljs.core.array_seq(arguments, 3))
    }
    throw"Invalid arity: " + arguments.length;
  };
  comp.cljs$lang$maxFixedArity = 3;
  comp.cljs$lang$applyTo = comp__4.cljs$lang$applyTo;
  comp.cljs$lang$arity$0 = comp__0;
  comp.cljs$lang$arity$1 = comp__1;
  comp.cljs$lang$arity$2 = comp__2;
  comp.cljs$lang$arity$3 = comp__3;
  comp.cljs$lang$arity$variadic = comp__4.cljs$lang$arity$variadic;
  return comp
}();
cljs.core.partial = function() {
  var partial = null;
  var partial__2 = function(f, arg1) {
    return function() {
      var G__7672__delegate = function(args) {
        return cljs.core.apply.call(null, f, arg1, args)
      };
      var G__7672 = function(var_args) {
        var args = null;
        if(goog.isDef(var_args)) {
          args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
        }
        return G__7672__delegate.call(this, args)
      };
      G__7672.cljs$lang$maxFixedArity = 0;
      G__7672.cljs$lang$applyTo = function(arglist__7673) {
        var args = cljs.core.seq(arglist__7673);
        return G__7672__delegate(args)
      };
      G__7672.cljs$lang$arity$variadic = G__7672__delegate;
      return G__7672
    }()
  };
  var partial__3 = function(f, arg1, arg2) {
    return function() {
      var G__7674__delegate = function(args) {
        return cljs.core.apply.call(null, f, arg1, arg2, args)
      };
      var G__7674 = function(var_args) {
        var args = null;
        if(goog.isDef(var_args)) {
          args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
        }
        return G__7674__delegate.call(this, args)
      };
      G__7674.cljs$lang$maxFixedArity = 0;
      G__7674.cljs$lang$applyTo = function(arglist__7675) {
        var args = cljs.core.seq(arglist__7675);
        return G__7674__delegate(args)
      };
      G__7674.cljs$lang$arity$variadic = G__7674__delegate;
      return G__7674
    }()
  };
  var partial__4 = function(f, arg1, arg2, arg3) {
    return function() {
      var G__7676__delegate = function(args) {
        return cljs.core.apply.call(null, f, arg1, arg2, arg3, args)
      };
      var G__7676 = function(var_args) {
        var args = null;
        if(goog.isDef(var_args)) {
          args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
        }
        return G__7676__delegate.call(this, args)
      };
      G__7676.cljs$lang$maxFixedArity = 0;
      G__7676.cljs$lang$applyTo = function(arglist__7677) {
        var args = cljs.core.seq(arglist__7677);
        return G__7676__delegate(args)
      };
      G__7676.cljs$lang$arity$variadic = G__7676__delegate;
      return G__7676
    }()
  };
  var partial__5 = function() {
    var G__7678__delegate = function(f, arg1, arg2, arg3, more) {
      return function() {
        var G__7679__delegate = function(args) {
          return cljs.core.apply.call(null, f, arg1, arg2, arg3, cljs.core.concat.call(null, more, args))
        };
        var G__7679 = function(var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
          }
          return G__7679__delegate.call(this, args)
        };
        G__7679.cljs$lang$maxFixedArity = 0;
        G__7679.cljs$lang$applyTo = function(arglist__7680) {
          var args = cljs.core.seq(arglist__7680);
          return G__7679__delegate(args)
        };
        G__7679.cljs$lang$arity$variadic = G__7679__delegate;
        return G__7679
      }()
    };
    var G__7678 = function(f, arg1, arg2, arg3, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 4), 0)
      }
      return G__7678__delegate.call(this, f, arg1, arg2, arg3, more)
    };
    G__7678.cljs$lang$maxFixedArity = 4;
    G__7678.cljs$lang$applyTo = function(arglist__7681) {
      var f = cljs.core.first(arglist__7681);
      var arg1 = cljs.core.first(cljs.core.next(arglist__7681));
      var arg2 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__7681)));
      var arg3 = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__7681))));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(arglist__7681))));
      return G__7678__delegate(f, arg1, arg2, arg3, more)
    };
    G__7678.cljs$lang$arity$variadic = G__7678__delegate;
    return G__7678
  }();
  partial = function(f, arg1, arg2, arg3, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return partial__2.call(this, f, arg1);
      case 3:
        return partial__3.call(this, f, arg1, arg2);
      case 4:
        return partial__4.call(this, f, arg1, arg2, arg3);
      default:
        return partial__5.cljs$lang$arity$variadic(f, arg1, arg2, arg3, cljs.core.array_seq(arguments, 4))
    }
    throw"Invalid arity: " + arguments.length;
  };
  partial.cljs$lang$maxFixedArity = 4;
  partial.cljs$lang$applyTo = partial__5.cljs$lang$applyTo;
  partial.cljs$lang$arity$2 = partial__2;
  partial.cljs$lang$arity$3 = partial__3;
  partial.cljs$lang$arity$4 = partial__4;
  partial.cljs$lang$arity$variadic = partial__5.cljs$lang$arity$variadic;
  return partial
}();
cljs.core.fnil = function() {
  var fnil = null;
  var fnil__2 = function(f, x) {
    return function() {
      var G__7682 = null;
      var G__7682__1 = function(a) {
        return f.call(null, a == null ? x : a)
      };
      var G__7682__2 = function(a, b) {
        return f.call(null, a == null ? x : a, b)
      };
      var G__7682__3 = function(a, b, c) {
        return f.call(null, a == null ? x : a, b, c)
      };
      var G__7682__4 = function() {
        var G__7683__delegate = function(a, b, c, ds) {
          return cljs.core.apply.call(null, f, a == null ? x : a, b, c, ds)
        };
        var G__7683 = function(a, b, c, var_args) {
          var ds = null;
          if(goog.isDef(var_args)) {
            ds = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__7683__delegate.call(this, a, b, c, ds)
        };
        G__7683.cljs$lang$maxFixedArity = 3;
        G__7683.cljs$lang$applyTo = function(arglist__7684) {
          var a = cljs.core.first(arglist__7684);
          var b = cljs.core.first(cljs.core.next(arglist__7684));
          var c = cljs.core.first(cljs.core.next(cljs.core.next(arglist__7684)));
          var ds = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__7684)));
          return G__7683__delegate(a, b, c, ds)
        };
        G__7683.cljs$lang$arity$variadic = G__7683__delegate;
        return G__7683
      }();
      G__7682 = function(a, b, c, var_args) {
        var ds = var_args;
        switch(arguments.length) {
          case 1:
            return G__7682__1.call(this, a);
          case 2:
            return G__7682__2.call(this, a, b);
          case 3:
            return G__7682__3.call(this, a, b, c);
          default:
            return G__7682__4.cljs$lang$arity$variadic(a, b, c, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__7682.cljs$lang$maxFixedArity = 3;
      G__7682.cljs$lang$applyTo = G__7682__4.cljs$lang$applyTo;
      return G__7682
    }()
  };
  var fnil__3 = function(f, x, y) {
    return function() {
      var G__7685 = null;
      var G__7685__2 = function(a, b) {
        return f.call(null, a == null ? x : a, b == null ? y : b)
      };
      var G__7685__3 = function(a, b, c) {
        return f.call(null, a == null ? x : a, b == null ? y : b, c)
      };
      var G__7685__4 = function() {
        var G__7686__delegate = function(a, b, c, ds) {
          return cljs.core.apply.call(null, f, a == null ? x : a, b == null ? y : b, c, ds)
        };
        var G__7686 = function(a, b, c, var_args) {
          var ds = null;
          if(goog.isDef(var_args)) {
            ds = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__7686__delegate.call(this, a, b, c, ds)
        };
        G__7686.cljs$lang$maxFixedArity = 3;
        G__7686.cljs$lang$applyTo = function(arglist__7687) {
          var a = cljs.core.first(arglist__7687);
          var b = cljs.core.first(cljs.core.next(arglist__7687));
          var c = cljs.core.first(cljs.core.next(cljs.core.next(arglist__7687)));
          var ds = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__7687)));
          return G__7686__delegate(a, b, c, ds)
        };
        G__7686.cljs$lang$arity$variadic = G__7686__delegate;
        return G__7686
      }();
      G__7685 = function(a, b, c, var_args) {
        var ds = var_args;
        switch(arguments.length) {
          case 2:
            return G__7685__2.call(this, a, b);
          case 3:
            return G__7685__3.call(this, a, b, c);
          default:
            return G__7685__4.cljs$lang$arity$variadic(a, b, c, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__7685.cljs$lang$maxFixedArity = 3;
      G__7685.cljs$lang$applyTo = G__7685__4.cljs$lang$applyTo;
      return G__7685
    }()
  };
  var fnil__4 = function(f, x, y, z) {
    return function() {
      var G__7688 = null;
      var G__7688__2 = function(a, b) {
        return f.call(null, a == null ? x : a, b == null ? y : b)
      };
      var G__7688__3 = function(a, b, c) {
        return f.call(null, a == null ? x : a, b == null ? y : b, c == null ? z : c)
      };
      var G__7688__4 = function() {
        var G__7689__delegate = function(a, b, c, ds) {
          return cljs.core.apply.call(null, f, a == null ? x : a, b == null ? y : b, c == null ? z : c, ds)
        };
        var G__7689 = function(a, b, c, var_args) {
          var ds = null;
          if(goog.isDef(var_args)) {
            ds = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__7689__delegate.call(this, a, b, c, ds)
        };
        G__7689.cljs$lang$maxFixedArity = 3;
        G__7689.cljs$lang$applyTo = function(arglist__7690) {
          var a = cljs.core.first(arglist__7690);
          var b = cljs.core.first(cljs.core.next(arglist__7690));
          var c = cljs.core.first(cljs.core.next(cljs.core.next(arglist__7690)));
          var ds = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__7690)));
          return G__7689__delegate(a, b, c, ds)
        };
        G__7689.cljs$lang$arity$variadic = G__7689__delegate;
        return G__7689
      }();
      G__7688 = function(a, b, c, var_args) {
        var ds = var_args;
        switch(arguments.length) {
          case 2:
            return G__7688__2.call(this, a, b);
          case 3:
            return G__7688__3.call(this, a, b, c);
          default:
            return G__7688__4.cljs$lang$arity$variadic(a, b, c, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__7688.cljs$lang$maxFixedArity = 3;
      G__7688.cljs$lang$applyTo = G__7688__4.cljs$lang$applyTo;
      return G__7688
    }()
  };
  fnil = function(f, x, y, z) {
    switch(arguments.length) {
      case 2:
        return fnil__2.call(this, f, x);
      case 3:
        return fnil__3.call(this, f, x, y);
      case 4:
        return fnil__4.call(this, f, x, y, z)
    }
    throw"Invalid arity: " + arguments.length;
  };
  fnil.cljs$lang$arity$2 = fnil__2;
  fnil.cljs$lang$arity$3 = fnil__3;
  fnil.cljs$lang$arity$4 = fnil__4;
  return fnil
}();
cljs.core.map_indexed = function map_indexed(f, coll) {
  var mapi__7706 = function mapi(idx, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____7714 = cljs.core.seq.call(null, coll);
      if(temp__3974__auto____7714) {
        var s__7715 = temp__3974__auto____7714;
        if(cljs.core.chunked_seq_QMARK_.call(null, s__7715)) {
          var c__7716 = cljs.core.chunk_first.call(null, s__7715);
          var size__7717 = cljs.core.count.call(null, c__7716);
          var b__7718 = cljs.core.chunk_buffer.call(null, size__7717);
          var n__2527__auto____7719 = size__7717;
          var i__7720 = 0;
          while(true) {
            if(i__7720 < n__2527__auto____7719) {
              cljs.core.chunk_append.call(null, b__7718, f.call(null, idx + i__7720, cljs.core._nth.call(null, c__7716, i__7720)));
              var G__7721 = i__7720 + 1;
              i__7720 = G__7721;
              continue
            }else {
            }
            break
          }
          return cljs.core.chunk_cons.call(null, cljs.core.chunk.call(null, b__7718), mapi.call(null, idx + size__7717, cljs.core.chunk_rest.call(null, s__7715)))
        }else {
          return cljs.core.cons.call(null, f.call(null, idx, cljs.core.first.call(null, s__7715)), mapi.call(null, idx + 1, cljs.core.rest.call(null, s__7715)))
        }
      }else {
        return null
      }
    }, null)
  };
  return mapi__7706.call(null, 0, coll)
};
cljs.core.keep = function keep(f, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3974__auto____7731 = cljs.core.seq.call(null, coll);
    if(temp__3974__auto____7731) {
      var s__7732 = temp__3974__auto____7731;
      if(cljs.core.chunked_seq_QMARK_.call(null, s__7732)) {
        var c__7733 = cljs.core.chunk_first.call(null, s__7732);
        var size__7734 = cljs.core.count.call(null, c__7733);
        var b__7735 = cljs.core.chunk_buffer.call(null, size__7734);
        var n__2527__auto____7736 = size__7734;
        var i__7737 = 0;
        while(true) {
          if(i__7737 < n__2527__auto____7736) {
            var x__7738 = f.call(null, cljs.core._nth.call(null, c__7733, i__7737));
            if(x__7738 == null) {
            }else {
              cljs.core.chunk_append.call(null, b__7735, x__7738)
            }
            var G__7740 = i__7737 + 1;
            i__7737 = G__7740;
            continue
          }else {
          }
          break
        }
        return cljs.core.chunk_cons.call(null, cljs.core.chunk.call(null, b__7735), keep.call(null, f, cljs.core.chunk_rest.call(null, s__7732)))
      }else {
        var x__7739 = f.call(null, cljs.core.first.call(null, s__7732));
        if(x__7739 == null) {
          return keep.call(null, f, cljs.core.rest.call(null, s__7732))
        }else {
          return cljs.core.cons.call(null, x__7739, keep.call(null, f, cljs.core.rest.call(null, s__7732)))
        }
      }
    }else {
      return null
    }
  }, null)
};
cljs.core.keep_indexed = function keep_indexed(f, coll) {
  var keepi__7766 = function keepi(idx, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____7776 = cljs.core.seq.call(null, coll);
      if(temp__3974__auto____7776) {
        var s__7777 = temp__3974__auto____7776;
        if(cljs.core.chunked_seq_QMARK_.call(null, s__7777)) {
          var c__7778 = cljs.core.chunk_first.call(null, s__7777);
          var size__7779 = cljs.core.count.call(null, c__7778);
          var b__7780 = cljs.core.chunk_buffer.call(null, size__7779);
          var n__2527__auto____7781 = size__7779;
          var i__7782 = 0;
          while(true) {
            if(i__7782 < n__2527__auto____7781) {
              var x__7783 = f.call(null, idx + i__7782, cljs.core._nth.call(null, c__7778, i__7782));
              if(x__7783 == null) {
              }else {
                cljs.core.chunk_append.call(null, b__7780, x__7783)
              }
              var G__7785 = i__7782 + 1;
              i__7782 = G__7785;
              continue
            }else {
            }
            break
          }
          return cljs.core.chunk_cons.call(null, cljs.core.chunk.call(null, b__7780), keepi.call(null, idx + size__7779, cljs.core.chunk_rest.call(null, s__7777)))
        }else {
          var x__7784 = f.call(null, idx, cljs.core.first.call(null, s__7777));
          if(x__7784 == null) {
            return keepi.call(null, idx + 1, cljs.core.rest.call(null, s__7777))
          }else {
            return cljs.core.cons.call(null, x__7784, keepi.call(null, idx + 1, cljs.core.rest.call(null, s__7777)))
          }
        }
      }else {
        return null
      }
    }, null)
  };
  return keepi__7766.call(null, 0, coll)
};
cljs.core.every_pred = function() {
  var every_pred = null;
  var every_pred__1 = function(p) {
    return function() {
      var ep1 = null;
      var ep1__0 = function() {
        return true
      };
      var ep1__1 = function(x) {
        return cljs.core.boolean$.call(null, p.call(null, x))
      };
      var ep1__2 = function(x, y) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____7871 = p.call(null, x);
          if(cljs.core.truth_(and__3822__auto____7871)) {
            return p.call(null, y)
          }else {
            return and__3822__auto____7871
          }
        }())
      };
      var ep1__3 = function(x, y, z) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____7872 = p.call(null, x);
          if(cljs.core.truth_(and__3822__auto____7872)) {
            var and__3822__auto____7873 = p.call(null, y);
            if(cljs.core.truth_(and__3822__auto____7873)) {
              return p.call(null, z)
            }else {
              return and__3822__auto____7873
            }
          }else {
            return and__3822__auto____7872
          }
        }())
      };
      var ep1__4 = function() {
        var G__7942__delegate = function(x, y, z, args) {
          return cljs.core.boolean$.call(null, function() {
            var and__3822__auto____7874 = ep1.call(null, x, y, z);
            if(cljs.core.truth_(and__3822__auto____7874)) {
              return cljs.core.every_QMARK_.call(null, p, args)
            }else {
              return and__3822__auto____7874
            }
          }())
        };
        var G__7942 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__7942__delegate.call(this, x, y, z, args)
        };
        G__7942.cljs$lang$maxFixedArity = 3;
        G__7942.cljs$lang$applyTo = function(arglist__7943) {
          var x = cljs.core.first(arglist__7943);
          var y = cljs.core.first(cljs.core.next(arglist__7943));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__7943)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__7943)));
          return G__7942__delegate(x, y, z, args)
        };
        G__7942.cljs$lang$arity$variadic = G__7942__delegate;
        return G__7942
      }();
      ep1 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return ep1__0.call(this);
          case 1:
            return ep1__1.call(this, x);
          case 2:
            return ep1__2.call(this, x, y);
          case 3:
            return ep1__3.call(this, x, y, z);
          default:
            return ep1__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      ep1.cljs$lang$maxFixedArity = 3;
      ep1.cljs$lang$applyTo = ep1__4.cljs$lang$applyTo;
      ep1.cljs$lang$arity$0 = ep1__0;
      ep1.cljs$lang$arity$1 = ep1__1;
      ep1.cljs$lang$arity$2 = ep1__2;
      ep1.cljs$lang$arity$3 = ep1__3;
      ep1.cljs$lang$arity$variadic = ep1__4.cljs$lang$arity$variadic;
      return ep1
    }()
  };
  var every_pred__2 = function(p1, p2) {
    return function() {
      var ep2 = null;
      var ep2__0 = function() {
        return true
      };
      var ep2__1 = function(x) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____7886 = p1.call(null, x);
          if(cljs.core.truth_(and__3822__auto____7886)) {
            return p2.call(null, x)
          }else {
            return and__3822__auto____7886
          }
        }())
      };
      var ep2__2 = function(x, y) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____7887 = p1.call(null, x);
          if(cljs.core.truth_(and__3822__auto____7887)) {
            var and__3822__auto____7888 = p1.call(null, y);
            if(cljs.core.truth_(and__3822__auto____7888)) {
              var and__3822__auto____7889 = p2.call(null, x);
              if(cljs.core.truth_(and__3822__auto____7889)) {
                return p2.call(null, y)
              }else {
                return and__3822__auto____7889
              }
            }else {
              return and__3822__auto____7888
            }
          }else {
            return and__3822__auto____7887
          }
        }())
      };
      var ep2__3 = function(x, y, z) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____7890 = p1.call(null, x);
          if(cljs.core.truth_(and__3822__auto____7890)) {
            var and__3822__auto____7891 = p1.call(null, y);
            if(cljs.core.truth_(and__3822__auto____7891)) {
              var and__3822__auto____7892 = p1.call(null, z);
              if(cljs.core.truth_(and__3822__auto____7892)) {
                var and__3822__auto____7893 = p2.call(null, x);
                if(cljs.core.truth_(and__3822__auto____7893)) {
                  var and__3822__auto____7894 = p2.call(null, y);
                  if(cljs.core.truth_(and__3822__auto____7894)) {
                    return p2.call(null, z)
                  }else {
                    return and__3822__auto____7894
                  }
                }else {
                  return and__3822__auto____7893
                }
              }else {
                return and__3822__auto____7892
              }
            }else {
              return and__3822__auto____7891
            }
          }else {
            return and__3822__auto____7890
          }
        }())
      };
      var ep2__4 = function() {
        var G__7944__delegate = function(x, y, z, args) {
          return cljs.core.boolean$.call(null, function() {
            var and__3822__auto____7895 = ep2.call(null, x, y, z);
            if(cljs.core.truth_(and__3822__auto____7895)) {
              return cljs.core.every_QMARK_.call(null, function(p1__7741_SHARP_) {
                var and__3822__auto____7896 = p1.call(null, p1__7741_SHARP_);
                if(cljs.core.truth_(and__3822__auto____7896)) {
                  return p2.call(null, p1__7741_SHARP_)
                }else {
                  return and__3822__auto____7896
                }
              }, args)
            }else {
              return and__3822__auto____7895
            }
          }())
        };
        var G__7944 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__7944__delegate.call(this, x, y, z, args)
        };
        G__7944.cljs$lang$maxFixedArity = 3;
        G__7944.cljs$lang$applyTo = function(arglist__7945) {
          var x = cljs.core.first(arglist__7945);
          var y = cljs.core.first(cljs.core.next(arglist__7945));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__7945)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__7945)));
          return G__7944__delegate(x, y, z, args)
        };
        G__7944.cljs$lang$arity$variadic = G__7944__delegate;
        return G__7944
      }();
      ep2 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return ep2__0.call(this);
          case 1:
            return ep2__1.call(this, x);
          case 2:
            return ep2__2.call(this, x, y);
          case 3:
            return ep2__3.call(this, x, y, z);
          default:
            return ep2__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      ep2.cljs$lang$maxFixedArity = 3;
      ep2.cljs$lang$applyTo = ep2__4.cljs$lang$applyTo;
      ep2.cljs$lang$arity$0 = ep2__0;
      ep2.cljs$lang$arity$1 = ep2__1;
      ep2.cljs$lang$arity$2 = ep2__2;
      ep2.cljs$lang$arity$3 = ep2__3;
      ep2.cljs$lang$arity$variadic = ep2__4.cljs$lang$arity$variadic;
      return ep2
    }()
  };
  var every_pred__3 = function(p1, p2, p3) {
    return function() {
      var ep3 = null;
      var ep3__0 = function() {
        return true
      };
      var ep3__1 = function(x) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____7915 = p1.call(null, x);
          if(cljs.core.truth_(and__3822__auto____7915)) {
            var and__3822__auto____7916 = p2.call(null, x);
            if(cljs.core.truth_(and__3822__auto____7916)) {
              return p3.call(null, x)
            }else {
              return and__3822__auto____7916
            }
          }else {
            return and__3822__auto____7915
          }
        }())
      };
      var ep3__2 = function(x, y) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____7917 = p1.call(null, x);
          if(cljs.core.truth_(and__3822__auto____7917)) {
            var and__3822__auto____7918 = p2.call(null, x);
            if(cljs.core.truth_(and__3822__auto____7918)) {
              var and__3822__auto____7919 = p3.call(null, x);
              if(cljs.core.truth_(and__3822__auto____7919)) {
                var and__3822__auto____7920 = p1.call(null, y);
                if(cljs.core.truth_(and__3822__auto____7920)) {
                  var and__3822__auto____7921 = p2.call(null, y);
                  if(cljs.core.truth_(and__3822__auto____7921)) {
                    return p3.call(null, y)
                  }else {
                    return and__3822__auto____7921
                  }
                }else {
                  return and__3822__auto____7920
                }
              }else {
                return and__3822__auto____7919
              }
            }else {
              return and__3822__auto____7918
            }
          }else {
            return and__3822__auto____7917
          }
        }())
      };
      var ep3__3 = function(x, y, z) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____7922 = p1.call(null, x);
          if(cljs.core.truth_(and__3822__auto____7922)) {
            var and__3822__auto____7923 = p2.call(null, x);
            if(cljs.core.truth_(and__3822__auto____7923)) {
              var and__3822__auto____7924 = p3.call(null, x);
              if(cljs.core.truth_(and__3822__auto____7924)) {
                var and__3822__auto____7925 = p1.call(null, y);
                if(cljs.core.truth_(and__3822__auto____7925)) {
                  var and__3822__auto____7926 = p2.call(null, y);
                  if(cljs.core.truth_(and__3822__auto____7926)) {
                    var and__3822__auto____7927 = p3.call(null, y);
                    if(cljs.core.truth_(and__3822__auto____7927)) {
                      var and__3822__auto____7928 = p1.call(null, z);
                      if(cljs.core.truth_(and__3822__auto____7928)) {
                        var and__3822__auto____7929 = p2.call(null, z);
                        if(cljs.core.truth_(and__3822__auto____7929)) {
                          return p3.call(null, z)
                        }else {
                          return and__3822__auto____7929
                        }
                      }else {
                        return and__3822__auto____7928
                      }
                    }else {
                      return and__3822__auto____7927
                    }
                  }else {
                    return and__3822__auto____7926
                  }
                }else {
                  return and__3822__auto____7925
                }
              }else {
                return and__3822__auto____7924
              }
            }else {
              return and__3822__auto____7923
            }
          }else {
            return and__3822__auto____7922
          }
        }())
      };
      var ep3__4 = function() {
        var G__7946__delegate = function(x, y, z, args) {
          return cljs.core.boolean$.call(null, function() {
            var and__3822__auto____7930 = ep3.call(null, x, y, z);
            if(cljs.core.truth_(and__3822__auto____7930)) {
              return cljs.core.every_QMARK_.call(null, function(p1__7742_SHARP_) {
                var and__3822__auto____7931 = p1.call(null, p1__7742_SHARP_);
                if(cljs.core.truth_(and__3822__auto____7931)) {
                  var and__3822__auto____7932 = p2.call(null, p1__7742_SHARP_);
                  if(cljs.core.truth_(and__3822__auto____7932)) {
                    return p3.call(null, p1__7742_SHARP_)
                  }else {
                    return and__3822__auto____7932
                  }
                }else {
                  return and__3822__auto____7931
                }
              }, args)
            }else {
              return and__3822__auto____7930
            }
          }())
        };
        var G__7946 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__7946__delegate.call(this, x, y, z, args)
        };
        G__7946.cljs$lang$maxFixedArity = 3;
        G__7946.cljs$lang$applyTo = function(arglist__7947) {
          var x = cljs.core.first(arglist__7947);
          var y = cljs.core.first(cljs.core.next(arglist__7947));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__7947)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__7947)));
          return G__7946__delegate(x, y, z, args)
        };
        G__7946.cljs$lang$arity$variadic = G__7946__delegate;
        return G__7946
      }();
      ep3 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return ep3__0.call(this);
          case 1:
            return ep3__1.call(this, x);
          case 2:
            return ep3__2.call(this, x, y);
          case 3:
            return ep3__3.call(this, x, y, z);
          default:
            return ep3__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      ep3.cljs$lang$maxFixedArity = 3;
      ep3.cljs$lang$applyTo = ep3__4.cljs$lang$applyTo;
      ep3.cljs$lang$arity$0 = ep3__0;
      ep3.cljs$lang$arity$1 = ep3__1;
      ep3.cljs$lang$arity$2 = ep3__2;
      ep3.cljs$lang$arity$3 = ep3__3;
      ep3.cljs$lang$arity$variadic = ep3__4.cljs$lang$arity$variadic;
      return ep3
    }()
  };
  var every_pred__4 = function() {
    var G__7948__delegate = function(p1, p2, p3, ps) {
      var ps__7933 = cljs.core.list_STAR_.call(null, p1, p2, p3, ps);
      return function() {
        var epn = null;
        var epn__0 = function() {
          return true
        };
        var epn__1 = function(x) {
          return cljs.core.every_QMARK_.call(null, function(p1__7743_SHARP_) {
            return p1__7743_SHARP_.call(null, x)
          }, ps__7933)
        };
        var epn__2 = function(x, y) {
          return cljs.core.every_QMARK_.call(null, function(p1__7744_SHARP_) {
            var and__3822__auto____7938 = p1__7744_SHARP_.call(null, x);
            if(cljs.core.truth_(and__3822__auto____7938)) {
              return p1__7744_SHARP_.call(null, y)
            }else {
              return and__3822__auto____7938
            }
          }, ps__7933)
        };
        var epn__3 = function(x, y, z) {
          return cljs.core.every_QMARK_.call(null, function(p1__7745_SHARP_) {
            var and__3822__auto____7939 = p1__7745_SHARP_.call(null, x);
            if(cljs.core.truth_(and__3822__auto____7939)) {
              var and__3822__auto____7940 = p1__7745_SHARP_.call(null, y);
              if(cljs.core.truth_(and__3822__auto____7940)) {
                return p1__7745_SHARP_.call(null, z)
              }else {
                return and__3822__auto____7940
              }
            }else {
              return and__3822__auto____7939
            }
          }, ps__7933)
        };
        var epn__4 = function() {
          var G__7949__delegate = function(x, y, z, args) {
            return cljs.core.boolean$.call(null, function() {
              var and__3822__auto____7941 = epn.call(null, x, y, z);
              if(cljs.core.truth_(and__3822__auto____7941)) {
                return cljs.core.every_QMARK_.call(null, function(p1__7746_SHARP_) {
                  return cljs.core.every_QMARK_.call(null, p1__7746_SHARP_, args)
                }, ps__7933)
              }else {
                return and__3822__auto____7941
              }
            }())
          };
          var G__7949 = function(x, y, z, var_args) {
            var args = null;
            if(goog.isDef(var_args)) {
              args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
            }
            return G__7949__delegate.call(this, x, y, z, args)
          };
          G__7949.cljs$lang$maxFixedArity = 3;
          G__7949.cljs$lang$applyTo = function(arglist__7950) {
            var x = cljs.core.first(arglist__7950);
            var y = cljs.core.first(cljs.core.next(arglist__7950));
            var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__7950)));
            var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__7950)));
            return G__7949__delegate(x, y, z, args)
          };
          G__7949.cljs$lang$arity$variadic = G__7949__delegate;
          return G__7949
        }();
        epn = function(x, y, z, var_args) {
          var args = var_args;
          switch(arguments.length) {
            case 0:
              return epn__0.call(this);
            case 1:
              return epn__1.call(this, x);
            case 2:
              return epn__2.call(this, x, y);
            case 3:
              return epn__3.call(this, x, y, z);
            default:
              return epn__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
          }
          throw"Invalid arity: " + arguments.length;
        };
        epn.cljs$lang$maxFixedArity = 3;
        epn.cljs$lang$applyTo = epn__4.cljs$lang$applyTo;
        epn.cljs$lang$arity$0 = epn__0;
        epn.cljs$lang$arity$1 = epn__1;
        epn.cljs$lang$arity$2 = epn__2;
        epn.cljs$lang$arity$3 = epn__3;
        epn.cljs$lang$arity$variadic = epn__4.cljs$lang$arity$variadic;
        return epn
      }()
    };
    var G__7948 = function(p1, p2, p3, var_args) {
      var ps = null;
      if(goog.isDef(var_args)) {
        ps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__7948__delegate.call(this, p1, p2, p3, ps)
    };
    G__7948.cljs$lang$maxFixedArity = 3;
    G__7948.cljs$lang$applyTo = function(arglist__7951) {
      var p1 = cljs.core.first(arglist__7951);
      var p2 = cljs.core.first(cljs.core.next(arglist__7951));
      var p3 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__7951)));
      var ps = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__7951)));
      return G__7948__delegate(p1, p2, p3, ps)
    };
    G__7948.cljs$lang$arity$variadic = G__7948__delegate;
    return G__7948
  }();
  every_pred = function(p1, p2, p3, var_args) {
    var ps = var_args;
    switch(arguments.length) {
      case 1:
        return every_pred__1.call(this, p1);
      case 2:
        return every_pred__2.call(this, p1, p2);
      case 3:
        return every_pred__3.call(this, p1, p2, p3);
      default:
        return every_pred__4.cljs$lang$arity$variadic(p1, p2, p3, cljs.core.array_seq(arguments, 3))
    }
    throw"Invalid arity: " + arguments.length;
  };
  every_pred.cljs$lang$maxFixedArity = 3;
  every_pred.cljs$lang$applyTo = every_pred__4.cljs$lang$applyTo;
  every_pred.cljs$lang$arity$1 = every_pred__1;
  every_pred.cljs$lang$arity$2 = every_pred__2;
  every_pred.cljs$lang$arity$3 = every_pred__3;
  every_pred.cljs$lang$arity$variadic = every_pred__4.cljs$lang$arity$variadic;
  return every_pred
}();
cljs.core.some_fn = function() {
  var some_fn = null;
  var some_fn__1 = function(p) {
    return function() {
      var sp1 = null;
      var sp1__0 = function() {
        return null
      };
      var sp1__1 = function(x) {
        return p.call(null, x)
      };
      var sp1__2 = function(x, y) {
        var or__3824__auto____8032 = p.call(null, x);
        if(cljs.core.truth_(or__3824__auto____8032)) {
          return or__3824__auto____8032
        }else {
          return p.call(null, y)
        }
      };
      var sp1__3 = function(x, y, z) {
        var or__3824__auto____8033 = p.call(null, x);
        if(cljs.core.truth_(or__3824__auto____8033)) {
          return or__3824__auto____8033
        }else {
          var or__3824__auto____8034 = p.call(null, y);
          if(cljs.core.truth_(or__3824__auto____8034)) {
            return or__3824__auto____8034
          }else {
            return p.call(null, z)
          }
        }
      };
      var sp1__4 = function() {
        var G__8103__delegate = function(x, y, z, args) {
          var or__3824__auto____8035 = sp1.call(null, x, y, z);
          if(cljs.core.truth_(or__3824__auto____8035)) {
            return or__3824__auto____8035
          }else {
            return cljs.core.some.call(null, p, args)
          }
        };
        var G__8103 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__8103__delegate.call(this, x, y, z, args)
        };
        G__8103.cljs$lang$maxFixedArity = 3;
        G__8103.cljs$lang$applyTo = function(arglist__8104) {
          var x = cljs.core.first(arglist__8104);
          var y = cljs.core.first(cljs.core.next(arglist__8104));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8104)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8104)));
          return G__8103__delegate(x, y, z, args)
        };
        G__8103.cljs$lang$arity$variadic = G__8103__delegate;
        return G__8103
      }();
      sp1 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return sp1__0.call(this);
          case 1:
            return sp1__1.call(this, x);
          case 2:
            return sp1__2.call(this, x, y);
          case 3:
            return sp1__3.call(this, x, y, z);
          default:
            return sp1__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      sp1.cljs$lang$maxFixedArity = 3;
      sp1.cljs$lang$applyTo = sp1__4.cljs$lang$applyTo;
      sp1.cljs$lang$arity$0 = sp1__0;
      sp1.cljs$lang$arity$1 = sp1__1;
      sp1.cljs$lang$arity$2 = sp1__2;
      sp1.cljs$lang$arity$3 = sp1__3;
      sp1.cljs$lang$arity$variadic = sp1__4.cljs$lang$arity$variadic;
      return sp1
    }()
  };
  var some_fn__2 = function(p1, p2) {
    return function() {
      var sp2 = null;
      var sp2__0 = function() {
        return null
      };
      var sp2__1 = function(x) {
        var or__3824__auto____8047 = p1.call(null, x);
        if(cljs.core.truth_(or__3824__auto____8047)) {
          return or__3824__auto____8047
        }else {
          return p2.call(null, x)
        }
      };
      var sp2__2 = function(x, y) {
        var or__3824__auto____8048 = p1.call(null, x);
        if(cljs.core.truth_(or__3824__auto____8048)) {
          return or__3824__auto____8048
        }else {
          var or__3824__auto____8049 = p1.call(null, y);
          if(cljs.core.truth_(or__3824__auto____8049)) {
            return or__3824__auto____8049
          }else {
            var or__3824__auto____8050 = p2.call(null, x);
            if(cljs.core.truth_(or__3824__auto____8050)) {
              return or__3824__auto____8050
            }else {
              return p2.call(null, y)
            }
          }
        }
      };
      var sp2__3 = function(x, y, z) {
        var or__3824__auto____8051 = p1.call(null, x);
        if(cljs.core.truth_(or__3824__auto____8051)) {
          return or__3824__auto____8051
        }else {
          var or__3824__auto____8052 = p1.call(null, y);
          if(cljs.core.truth_(or__3824__auto____8052)) {
            return or__3824__auto____8052
          }else {
            var or__3824__auto____8053 = p1.call(null, z);
            if(cljs.core.truth_(or__3824__auto____8053)) {
              return or__3824__auto____8053
            }else {
              var or__3824__auto____8054 = p2.call(null, x);
              if(cljs.core.truth_(or__3824__auto____8054)) {
                return or__3824__auto____8054
              }else {
                var or__3824__auto____8055 = p2.call(null, y);
                if(cljs.core.truth_(or__3824__auto____8055)) {
                  return or__3824__auto____8055
                }else {
                  return p2.call(null, z)
                }
              }
            }
          }
        }
      };
      var sp2__4 = function() {
        var G__8105__delegate = function(x, y, z, args) {
          var or__3824__auto____8056 = sp2.call(null, x, y, z);
          if(cljs.core.truth_(or__3824__auto____8056)) {
            return or__3824__auto____8056
          }else {
            return cljs.core.some.call(null, function(p1__7786_SHARP_) {
              var or__3824__auto____8057 = p1.call(null, p1__7786_SHARP_);
              if(cljs.core.truth_(or__3824__auto____8057)) {
                return or__3824__auto____8057
              }else {
                return p2.call(null, p1__7786_SHARP_)
              }
            }, args)
          }
        };
        var G__8105 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__8105__delegate.call(this, x, y, z, args)
        };
        G__8105.cljs$lang$maxFixedArity = 3;
        G__8105.cljs$lang$applyTo = function(arglist__8106) {
          var x = cljs.core.first(arglist__8106);
          var y = cljs.core.first(cljs.core.next(arglist__8106));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8106)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8106)));
          return G__8105__delegate(x, y, z, args)
        };
        G__8105.cljs$lang$arity$variadic = G__8105__delegate;
        return G__8105
      }();
      sp2 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return sp2__0.call(this);
          case 1:
            return sp2__1.call(this, x);
          case 2:
            return sp2__2.call(this, x, y);
          case 3:
            return sp2__3.call(this, x, y, z);
          default:
            return sp2__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      sp2.cljs$lang$maxFixedArity = 3;
      sp2.cljs$lang$applyTo = sp2__4.cljs$lang$applyTo;
      sp2.cljs$lang$arity$0 = sp2__0;
      sp2.cljs$lang$arity$1 = sp2__1;
      sp2.cljs$lang$arity$2 = sp2__2;
      sp2.cljs$lang$arity$3 = sp2__3;
      sp2.cljs$lang$arity$variadic = sp2__4.cljs$lang$arity$variadic;
      return sp2
    }()
  };
  var some_fn__3 = function(p1, p2, p3) {
    return function() {
      var sp3 = null;
      var sp3__0 = function() {
        return null
      };
      var sp3__1 = function(x) {
        var or__3824__auto____8076 = p1.call(null, x);
        if(cljs.core.truth_(or__3824__auto____8076)) {
          return or__3824__auto____8076
        }else {
          var or__3824__auto____8077 = p2.call(null, x);
          if(cljs.core.truth_(or__3824__auto____8077)) {
            return or__3824__auto____8077
          }else {
            return p3.call(null, x)
          }
        }
      };
      var sp3__2 = function(x, y) {
        var or__3824__auto____8078 = p1.call(null, x);
        if(cljs.core.truth_(or__3824__auto____8078)) {
          return or__3824__auto____8078
        }else {
          var or__3824__auto____8079 = p2.call(null, x);
          if(cljs.core.truth_(or__3824__auto____8079)) {
            return or__3824__auto____8079
          }else {
            var or__3824__auto____8080 = p3.call(null, x);
            if(cljs.core.truth_(or__3824__auto____8080)) {
              return or__3824__auto____8080
            }else {
              var or__3824__auto____8081 = p1.call(null, y);
              if(cljs.core.truth_(or__3824__auto____8081)) {
                return or__3824__auto____8081
              }else {
                var or__3824__auto____8082 = p2.call(null, y);
                if(cljs.core.truth_(or__3824__auto____8082)) {
                  return or__3824__auto____8082
                }else {
                  return p3.call(null, y)
                }
              }
            }
          }
        }
      };
      var sp3__3 = function(x, y, z) {
        var or__3824__auto____8083 = p1.call(null, x);
        if(cljs.core.truth_(or__3824__auto____8083)) {
          return or__3824__auto____8083
        }else {
          var or__3824__auto____8084 = p2.call(null, x);
          if(cljs.core.truth_(or__3824__auto____8084)) {
            return or__3824__auto____8084
          }else {
            var or__3824__auto____8085 = p3.call(null, x);
            if(cljs.core.truth_(or__3824__auto____8085)) {
              return or__3824__auto____8085
            }else {
              var or__3824__auto____8086 = p1.call(null, y);
              if(cljs.core.truth_(or__3824__auto____8086)) {
                return or__3824__auto____8086
              }else {
                var or__3824__auto____8087 = p2.call(null, y);
                if(cljs.core.truth_(or__3824__auto____8087)) {
                  return or__3824__auto____8087
                }else {
                  var or__3824__auto____8088 = p3.call(null, y);
                  if(cljs.core.truth_(or__3824__auto____8088)) {
                    return or__3824__auto____8088
                  }else {
                    var or__3824__auto____8089 = p1.call(null, z);
                    if(cljs.core.truth_(or__3824__auto____8089)) {
                      return or__3824__auto____8089
                    }else {
                      var or__3824__auto____8090 = p2.call(null, z);
                      if(cljs.core.truth_(or__3824__auto____8090)) {
                        return or__3824__auto____8090
                      }else {
                        return p3.call(null, z)
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };
      var sp3__4 = function() {
        var G__8107__delegate = function(x, y, z, args) {
          var or__3824__auto____8091 = sp3.call(null, x, y, z);
          if(cljs.core.truth_(or__3824__auto____8091)) {
            return or__3824__auto____8091
          }else {
            return cljs.core.some.call(null, function(p1__7787_SHARP_) {
              var or__3824__auto____8092 = p1.call(null, p1__7787_SHARP_);
              if(cljs.core.truth_(or__3824__auto____8092)) {
                return or__3824__auto____8092
              }else {
                var or__3824__auto____8093 = p2.call(null, p1__7787_SHARP_);
                if(cljs.core.truth_(or__3824__auto____8093)) {
                  return or__3824__auto____8093
                }else {
                  return p3.call(null, p1__7787_SHARP_)
                }
              }
            }, args)
          }
        };
        var G__8107 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__8107__delegate.call(this, x, y, z, args)
        };
        G__8107.cljs$lang$maxFixedArity = 3;
        G__8107.cljs$lang$applyTo = function(arglist__8108) {
          var x = cljs.core.first(arglist__8108);
          var y = cljs.core.first(cljs.core.next(arglist__8108));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8108)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8108)));
          return G__8107__delegate(x, y, z, args)
        };
        G__8107.cljs$lang$arity$variadic = G__8107__delegate;
        return G__8107
      }();
      sp3 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return sp3__0.call(this);
          case 1:
            return sp3__1.call(this, x);
          case 2:
            return sp3__2.call(this, x, y);
          case 3:
            return sp3__3.call(this, x, y, z);
          default:
            return sp3__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      sp3.cljs$lang$maxFixedArity = 3;
      sp3.cljs$lang$applyTo = sp3__4.cljs$lang$applyTo;
      sp3.cljs$lang$arity$0 = sp3__0;
      sp3.cljs$lang$arity$1 = sp3__1;
      sp3.cljs$lang$arity$2 = sp3__2;
      sp3.cljs$lang$arity$3 = sp3__3;
      sp3.cljs$lang$arity$variadic = sp3__4.cljs$lang$arity$variadic;
      return sp3
    }()
  };
  var some_fn__4 = function() {
    var G__8109__delegate = function(p1, p2, p3, ps) {
      var ps__8094 = cljs.core.list_STAR_.call(null, p1, p2, p3, ps);
      return function() {
        var spn = null;
        var spn__0 = function() {
          return null
        };
        var spn__1 = function(x) {
          return cljs.core.some.call(null, function(p1__7788_SHARP_) {
            return p1__7788_SHARP_.call(null, x)
          }, ps__8094)
        };
        var spn__2 = function(x, y) {
          return cljs.core.some.call(null, function(p1__7789_SHARP_) {
            var or__3824__auto____8099 = p1__7789_SHARP_.call(null, x);
            if(cljs.core.truth_(or__3824__auto____8099)) {
              return or__3824__auto____8099
            }else {
              return p1__7789_SHARP_.call(null, y)
            }
          }, ps__8094)
        };
        var spn__3 = function(x, y, z) {
          return cljs.core.some.call(null, function(p1__7790_SHARP_) {
            var or__3824__auto____8100 = p1__7790_SHARP_.call(null, x);
            if(cljs.core.truth_(or__3824__auto____8100)) {
              return or__3824__auto____8100
            }else {
              var or__3824__auto____8101 = p1__7790_SHARP_.call(null, y);
              if(cljs.core.truth_(or__3824__auto____8101)) {
                return or__3824__auto____8101
              }else {
                return p1__7790_SHARP_.call(null, z)
              }
            }
          }, ps__8094)
        };
        var spn__4 = function() {
          var G__8110__delegate = function(x, y, z, args) {
            var or__3824__auto____8102 = spn.call(null, x, y, z);
            if(cljs.core.truth_(or__3824__auto____8102)) {
              return or__3824__auto____8102
            }else {
              return cljs.core.some.call(null, function(p1__7791_SHARP_) {
                return cljs.core.some.call(null, p1__7791_SHARP_, args)
              }, ps__8094)
            }
          };
          var G__8110 = function(x, y, z, var_args) {
            var args = null;
            if(goog.isDef(var_args)) {
              args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
            }
            return G__8110__delegate.call(this, x, y, z, args)
          };
          G__8110.cljs$lang$maxFixedArity = 3;
          G__8110.cljs$lang$applyTo = function(arglist__8111) {
            var x = cljs.core.first(arglist__8111);
            var y = cljs.core.first(cljs.core.next(arglist__8111));
            var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8111)));
            var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8111)));
            return G__8110__delegate(x, y, z, args)
          };
          G__8110.cljs$lang$arity$variadic = G__8110__delegate;
          return G__8110
        }();
        spn = function(x, y, z, var_args) {
          var args = var_args;
          switch(arguments.length) {
            case 0:
              return spn__0.call(this);
            case 1:
              return spn__1.call(this, x);
            case 2:
              return spn__2.call(this, x, y);
            case 3:
              return spn__3.call(this, x, y, z);
            default:
              return spn__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
          }
          throw"Invalid arity: " + arguments.length;
        };
        spn.cljs$lang$maxFixedArity = 3;
        spn.cljs$lang$applyTo = spn__4.cljs$lang$applyTo;
        spn.cljs$lang$arity$0 = spn__0;
        spn.cljs$lang$arity$1 = spn__1;
        spn.cljs$lang$arity$2 = spn__2;
        spn.cljs$lang$arity$3 = spn__3;
        spn.cljs$lang$arity$variadic = spn__4.cljs$lang$arity$variadic;
        return spn
      }()
    };
    var G__8109 = function(p1, p2, p3, var_args) {
      var ps = null;
      if(goog.isDef(var_args)) {
        ps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__8109__delegate.call(this, p1, p2, p3, ps)
    };
    G__8109.cljs$lang$maxFixedArity = 3;
    G__8109.cljs$lang$applyTo = function(arglist__8112) {
      var p1 = cljs.core.first(arglist__8112);
      var p2 = cljs.core.first(cljs.core.next(arglist__8112));
      var p3 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8112)));
      var ps = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8112)));
      return G__8109__delegate(p1, p2, p3, ps)
    };
    G__8109.cljs$lang$arity$variadic = G__8109__delegate;
    return G__8109
  }();
  some_fn = function(p1, p2, p3, var_args) {
    var ps = var_args;
    switch(arguments.length) {
      case 1:
        return some_fn__1.call(this, p1);
      case 2:
        return some_fn__2.call(this, p1, p2);
      case 3:
        return some_fn__3.call(this, p1, p2, p3);
      default:
        return some_fn__4.cljs$lang$arity$variadic(p1, p2, p3, cljs.core.array_seq(arguments, 3))
    }
    throw"Invalid arity: " + arguments.length;
  };
  some_fn.cljs$lang$maxFixedArity = 3;
  some_fn.cljs$lang$applyTo = some_fn__4.cljs$lang$applyTo;
  some_fn.cljs$lang$arity$1 = some_fn__1;
  some_fn.cljs$lang$arity$2 = some_fn__2;
  some_fn.cljs$lang$arity$3 = some_fn__3;
  some_fn.cljs$lang$arity$variadic = some_fn__4.cljs$lang$arity$variadic;
  return some_fn
}();
cljs.core.map = function() {
  var map = null;
  var map__2 = function(f, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____8131 = cljs.core.seq.call(null, coll);
      if(temp__3974__auto____8131) {
        var s__8132 = temp__3974__auto____8131;
        if(cljs.core.chunked_seq_QMARK_.call(null, s__8132)) {
          var c__8133 = cljs.core.chunk_first.call(null, s__8132);
          var size__8134 = cljs.core.count.call(null, c__8133);
          var b__8135 = cljs.core.chunk_buffer.call(null, size__8134);
          var n__2527__auto____8136 = size__8134;
          var i__8137 = 0;
          while(true) {
            if(i__8137 < n__2527__auto____8136) {
              cljs.core.chunk_append.call(null, b__8135, f.call(null, cljs.core._nth.call(null, c__8133, i__8137)));
              var G__8149 = i__8137 + 1;
              i__8137 = G__8149;
              continue
            }else {
            }
            break
          }
          return cljs.core.chunk_cons.call(null, cljs.core.chunk.call(null, b__8135), map.call(null, f, cljs.core.chunk_rest.call(null, s__8132)))
        }else {
          return cljs.core.cons.call(null, f.call(null, cljs.core.first.call(null, s__8132)), map.call(null, f, cljs.core.rest.call(null, s__8132)))
        }
      }else {
        return null
      }
    }, null)
  };
  var map__3 = function(f, c1, c2) {
    return new cljs.core.LazySeq(null, false, function() {
      var s1__8138 = cljs.core.seq.call(null, c1);
      var s2__8139 = cljs.core.seq.call(null, c2);
      if(function() {
        var and__3822__auto____8140 = s1__8138;
        if(and__3822__auto____8140) {
          return s2__8139
        }else {
          return and__3822__auto____8140
        }
      }()) {
        return cljs.core.cons.call(null, f.call(null, cljs.core.first.call(null, s1__8138), cljs.core.first.call(null, s2__8139)), map.call(null, f, cljs.core.rest.call(null, s1__8138), cljs.core.rest.call(null, s2__8139)))
      }else {
        return null
      }
    }, null)
  };
  var map__4 = function(f, c1, c2, c3) {
    return new cljs.core.LazySeq(null, false, function() {
      var s1__8141 = cljs.core.seq.call(null, c1);
      var s2__8142 = cljs.core.seq.call(null, c2);
      var s3__8143 = cljs.core.seq.call(null, c3);
      if(function() {
        var and__3822__auto____8144 = s1__8141;
        if(and__3822__auto____8144) {
          var and__3822__auto____8145 = s2__8142;
          if(and__3822__auto____8145) {
            return s3__8143
          }else {
            return and__3822__auto____8145
          }
        }else {
          return and__3822__auto____8144
        }
      }()) {
        return cljs.core.cons.call(null, f.call(null, cljs.core.first.call(null, s1__8141), cljs.core.first.call(null, s2__8142), cljs.core.first.call(null, s3__8143)), map.call(null, f, cljs.core.rest.call(null, s1__8141), cljs.core.rest.call(null, s2__8142), cljs.core.rest.call(null, s3__8143)))
      }else {
        return null
      }
    }, null)
  };
  var map__5 = function() {
    var G__8150__delegate = function(f, c1, c2, c3, colls) {
      var step__8148 = function step(cs) {
        return new cljs.core.LazySeq(null, false, function() {
          var ss__8147 = map.call(null, cljs.core.seq, cs);
          if(cljs.core.every_QMARK_.call(null, cljs.core.identity, ss__8147)) {
            return cljs.core.cons.call(null, map.call(null, cljs.core.first, ss__8147), step.call(null, map.call(null, cljs.core.rest, ss__8147)))
          }else {
            return null
          }
        }, null)
      };
      return map.call(null, function(p1__7952_SHARP_) {
        return cljs.core.apply.call(null, f, p1__7952_SHARP_)
      }, step__8148.call(null, cljs.core.conj.call(null, colls, c3, c2, c1)))
    };
    var G__8150 = function(f, c1, c2, c3, var_args) {
      var colls = null;
      if(goog.isDef(var_args)) {
        colls = cljs.core.array_seq(Array.prototype.slice.call(arguments, 4), 0)
      }
      return G__8150__delegate.call(this, f, c1, c2, c3, colls)
    };
    G__8150.cljs$lang$maxFixedArity = 4;
    G__8150.cljs$lang$applyTo = function(arglist__8151) {
      var f = cljs.core.first(arglist__8151);
      var c1 = cljs.core.first(cljs.core.next(arglist__8151));
      var c2 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8151)));
      var c3 = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__8151))));
      var colls = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(arglist__8151))));
      return G__8150__delegate(f, c1, c2, c3, colls)
    };
    G__8150.cljs$lang$arity$variadic = G__8150__delegate;
    return G__8150
  }();
  map = function(f, c1, c2, c3, var_args) {
    var colls = var_args;
    switch(arguments.length) {
      case 2:
        return map__2.call(this, f, c1);
      case 3:
        return map__3.call(this, f, c1, c2);
      case 4:
        return map__4.call(this, f, c1, c2, c3);
      default:
        return map__5.cljs$lang$arity$variadic(f, c1, c2, c3, cljs.core.array_seq(arguments, 4))
    }
    throw"Invalid arity: " + arguments.length;
  };
  map.cljs$lang$maxFixedArity = 4;
  map.cljs$lang$applyTo = map__5.cljs$lang$applyTo;
  map.cljs$lang$arity$2 = map__2;
  map.cljs$lang$arity$3 = map__3;
  map.cljs$lang$arity$4 = map__4;
  map.cljs$lang$arity$variadic = map__5.cljs$lang$arity$variadic;
  return map
}();
cljs.core.take = function take(n, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    if(n > 0) {
      var temp__3974__auto____8154 = cljs.core.seq.call(null, coll);
      if(temp__3974__auto____8154) {
        var s__8155 = temp__3974__auto____8154;
        return cljs.core.cons.call(null, cljs.core.first.call(null, s__8155), take.call(null, n - 1, cljs.core.rest.call(null, s__8155)))
      }else {
        return null
      }
    }else {
      return null
    }
  }, null)
};
cljs.core.drop = function drop(n, coll) {
  var step__8161 = function(n, coll) {
    while(true) {
      var s__8159 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(function() {
        var and__3822__auto____8160 = n > 0;
        if(and__3822__auto____8160) {
          return s__8159
        }else {
          return and__3822__auto____8160
        }
      }())) {
        var G__8162 = n - 1;
        var G__8163 = cljs.core.rest.call(null, s__8159);
        n = G__8162;
        coll = G__8163;
        continue
      }else {
        return s__8159
      }
      break
    }
  };
  return new cljs.core.LazySeq(null, false, function() {
    return step__8161.call(null, n, coll)
  }, null)
};
cljs.core.drop_last = function() {
  var drop_last = null;
  var drop_last__1 = function(s) {
    return drop_last.call(null, 1, s)
  };
  var drop_last__2 = function(n, s) {
    return cljs.core.map.call(null, function(x, _) {
      return x
    }, s, cljs.core.drop.call(null, n, s))
  };
  drop_last = function(n, s) {
    switch(arguments.length) {
      case 1:
        return drop_last__1.call(this, n);
      case 2:
        return drop_last__2.call(this, n, s)
    }
    throw"Invalid arity: " + arguments.length;
  };
  drop_last.cljs$lang$arity$1 = drop_last__1;
  drop_last.cljs$lang$arity$2 = drop_last__2;
  return drop_last
}();
cljs.core.take_last = function take_last(n, coll) {
  var s__8166 = cljs.core.seq.call(null, coll);
  var lead__8167 = cljs.core.seq.call(null, cljs.core.drop.call(null, n, coll));
  while(true) {
    if(lead__8167) {
      var G__8168 = cljs.core.next.call(null, s__8166);
      var G__8169 = cljs.core.next.call(null, lead__8167);
      s__8166 = G__8168;
      lead__8167 = G__8169;
      continue
    }else {
      return s__8166
    }
    break
  }
};
cljs.core.drop_while = function drop_while(pred, coll) {
  var step__8175 = function(pred, coll) {
    while(true) {
      var s__8173 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(function() {
        var and__3822__auto____8174 = s__8173;
        if(and__3822__auto____8174) {
          return pred.call(null, cljs.core.first.call(null, s__8173))
        }else {
          return and__3822__auto____8174
        }
      }())) {
        var G__8176 = pred;
        var G__8177 = cljs.core.rest.call(null, s__8173);
        pred = G__8176;
        coll = G__8177;
        continue
      }else {
        return s__8173
      }
      break
    }
  };
  return new cljs.core.LazySeq(null, false, function() {
    return step__8175.call(null, pred, coll)
  }, null)
};
cljs.core.cycle = function cycle(coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3974__auto____8180 = cljs.core.seq.call(null, coll);
    if(temp__3974__auto____8180) {
      var s__8181 = temp__3974__auto____8180;
      return cljs.core.concat.call(null, s__8181, cycle.call(null, s__8181))
    }else {
      return null
    }
  }, null)
};
cljs.core.split_at = function split_at(n, coll) {
  return cljs.core.PersistentVector.fromArray([cljs.core.take.call(null, n, coll), cljs.core.drop.call(null, n, coll)], true)
};
cljs.core.repeat = function() {
  var repeat = null;
  var repeat__1 = function(x) {
    return new cljs.core.LazySeq(null, false, function() {
      return cljs.core.cons.call(null, x, repeat.call(null, x))
    }, null)
  };
  var repeat__2 = function(n, x) {
    return cljs.core.take.call(null, n, repeat.call(null, x))
  };
  repeat = function(n, x) {
    switch(arguments.length) {
      case 1:
        return repeat__1.call(this, n);
      case 2:
        return repeat__2.call(this, n, x)
    }
    throw"Invalid arity: " + arguments.length;
  };
  repeat.cljs$lang$arity$1 = repeat__1;
  repeat.cljs$lang$arity$2 = repeat__2;
  return repeat
}();
cljs.core.replicate = function replicate(n, x) {
  return cljs.core.take.call(null, n, cljs.core.repeat.call(null, x))
};
cljs.core.repeatedly = function() {
  var repeatedly = null;
  var repeatedly__1 = function(f) {
    return new cljs.core.LazySeq(null, false, function() {
      return cljs.core.cons.call(null, f.call(null), repeatedly.call(null, f))
    }, null)
  };
  var repeatedly__2 = function(n, f) {
    return cljs.core.take.call(null, n, repeatedly.call(null, f))
  };
  repeatedly = function(n, f) {
    switch(arguments.length) {
      case 1:
        return repeatedly__1.call(this, n);
      case 2:
        return repeatedly__2.call(this, n, f)
    }
    throw"Invalid arity: " + arguments.length;
  };
  repeatedly.cljs$lang$arity$1 = repeatedly__1;
  repeatedly.cljs$lang$arity$2 = repeatedly__2;
  return repeatedly
}();
cljs.core.iterate = function iterate(f, x) {
  return cljs.core.cons.call(null, x, new cljs.core.LazySeq(null, false, function() {
    return iterate.call(null, f, f.call(null, x))
  }, null))
};
cljs.core.interleave = function() {
  var interleave = null;
  var interleave__2 = function(c1, c2) {
    return new cljs.core.LazySeq(null, false, function() {
      var s1__8186 = cljs.core.seq.call(null, c1);
      var s2__8187 = cljs.core.seq.call(null, c2);
      if(function() {
        var and__3822__auto____8188 = s1__8186;
        if(and__3822__auto____8188) {
          return s2__8187
        }else {
          return and__3822__auto____8188
        }
      }()) {
        return cljs.core.cons.call(null, cljs.core.first.call(null, s1__8186), cljs.core.cons.call(null, cljs.core.first.call(null, s2__8187), interleave.call(null, cljs.core.rest.call(null, s1__8186), cljs.core.rest.call(null, s2__8187))))
      }else {
        return null
      }
    }, null)
  };
  var interleave__3 = function() {
    var G__8190__delegate = function(c1, c2, colls) {
      return new cljs.core.LazySeq(null, false, function() {
        var ss__8189 = cljs.core.map.call(null, cljs.core.seq, cljs.core.conj.call(null, colls, c2, c1));
        if(cljs.core.every_QMARK_.call(null, cljs.core.identity, ss__8189)) {
          return cljs.core.concat.call(null, cljs.core.map.call(null, cljs.core.first, ss__8189), cljs.core.apply.call(null, interleave, cljs.core.map.call(null, cljs.core.rest, ss__8189)))
        }else {
          return null
        }
      }, null)
    };
    var G__8190 = function(c1, c2, var_args) {
      var colls = null;
      if(goog.isDef(var_args)) {
        colls = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__8190__delegate.call(this, c1, c2, colls)
    };
    G__8190.cljs$lang$maxFixedArity = 2;
    G__8190.cljs$lang$applyTo = function(arglist__8191) {
      var c1 = cljs.core.first(arglist__8191);
      var c2 = cljs.core.first(cljs.core.next(arglist__8191));
      var colls = cljs.core.rest(cljs.core.next(arglist__8191));
      return G__8190__delegate(c1, c2, colls)
    };
    G__8190.cljs$lang$arity$variadic = G__8190__delegate;
    return G__8190
  }();
  interleave = function(c1, c2, var_args) {
    var colls = var_args;
    switch(arguments.length) {
      case 2:
        return interleave__2.call(this, c1, c2);
      default:
        return interleave__3.cljs$lang$arity$variadic(c1, c2, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  interleave.cljs$lang$maxFixedArity = 2;
  interleave.cljs$lang$applyTo = interleave__3.cljs$lang$applyTo;
  interleave.cljs$lang$arity$2 = interleave__2;
  interleave.cljs$lang$arity$variadic = interleave__3.cljs$lang$arity$variadic;
  return interleave
}();
cljs.core.interpose = function interpose(sep, coll) {
  return cljs.core.drop.call(null, 1, cljs.core.interleave.call(null, cljs.core.repeat.call(null, sep), coll))
};
cljs.core.flatten1 = function flatten1(colls) {
  var cat__8201 = function cat(coll, colls) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3971__auto____8199 = cljs.core.seq.call(null, coll);
      if(temp__3971__auto____8199) {
        var coll__8200 = temp__3971__auto____8199;
        return cljs.core.cons.call(null, cljs.core.first.call(null, coll__8200), cat.call(null, cljs.core.rest.call(null, coll__8200), colls))
      }else {
        if(cljs.core.seq.call(null, colls)) {
          return cat.call(null, cljs.core.first.call(null, colls), cljs.core.rest.call(null, colls))
        }else {
          return null
        }
      }
    }, null)
  };
  return cat__8201.call(null, null, colls)
};
cljs.core.mapcat = function() {
  var mapcat = null;
  var mapcat__2 = function(f, coll) {
    return cljs.core.flatten1.call(null, cljs.core.map.call(null, f, coll))
  };
  var mapcat__3 = function() {
    var G__8202__delegate = function(f, coll, colls) {
      return cljs.core.flatten1.call(null, cljs.core.apply.call(null, cljs.core.map, f, coll, colls))
    };
    var G__8202 = function(f, coll, var_args) {
      var colls = null;
      if(goog.isDef(var_args)) {
        colls = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__8202__delegate.call(this, f, coll, colls)
    };
    G__8202.cljs$lang$maxFixedArity = 2;
    G__8202.cljs$lang$applyTo = function(arglist__8203) {
      var f = cljs.core.first(arglist__8203);
      var coll = cljs.core.first(cljs.core.next(arglist__8203));
      var colls = cljs.core.rest(cljs.core.next(arglist__8203));
      return G__8202__delegate(f, coll, colls)
    };
    G__8202.cljs$lang$arity$variadic = G__8202__delegate;
    return G__8202
  }();
  mapcat = function(f, coll, var_args) {
    var colls = var_args;
    switch(arguments.length) {
      case 2:
        return mapcat__2.call(this, f, coll);
      default:
        return mapcat__3.cljs$lang$arity$variadic(f, coll, cljs.core.array_seq(arguments, 2))
    }
    throw"Invalid arity: " + arguments.length;
  };
  mapcat.cljs$lang$maxFixedArity = 2;
  mapcat.cljs$lang$applyTo = mapcat__3.cljs$lang$applyTo;
  mapcat.cljs$lang$arity$2 = mapcat__2;
  mapcat.cljs$lang$arity$variadic = mapcat__3.cljs$lang$arity$variadic;
  return mapcat
}();
cljs.core.filter = function filter(pred, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3974__auto____8213 = cljs.core.seq.call(null, coll);
    if(temp__3974__auto____8213) {
      var s__8214 = temp__3974__auto____8213;
      if(cljs.core.chunked_seq_QMARK_.call(null, s__8214)) {
        var c__8215 = cljs.core.chunk_first.call(null, s__8214);
        var size__8216 = cljs.core.count.call(null, c__8215);
        var b__8217 = cljs.core.chunk_buffer.call(null, size__8216);
        var n__2527__auto____8218 = size__8216;
        var i__8219 = 0;
        while(true) {
          if(i__8219 < n__2527__auto____8218) {
            if(cljs.core.truth_(pred.call(null, cljs.core._nth.call(null, c__8215, i__8219)))) {
              cljs.core.chunk_append.call(null, b__8217, cljs.core._nth.call(null, c__8215, i__8219))
            }else {
            }
            var G__8222 = i__8219 + 1;
            i__8219 = G__8222;
            continue
          }else {
          }
          break
        }
        return cljs.core.chunk_cons.call(null, cljs.core.chunk.call(null, b__8217), filter.call(null, pred, cljs.core.chunk_rest.call(null, s__8214)))
      }else {
        var f__8220 = cljs.core.first.call(null, s__8214);
        var r__8221 = cljs.core.rest.call(null, s__8214);
        if(cljs.core.truth_(pred.call(null, f__8220))) {
          return cljs.core.cons.call(null, f__8220, filter.call(null, pred, r__8221))
        }else {
          return filter.call(null, pred, r__8221)
        }
      }
    }else {
      return null
    }
  }, null)
};
cljs.core.remove = function remove(pred, coll) {
  return cljs.core.filter.call(null, cljs.core.complement.call(null, pred), coll)
};
cljs.core.tree_seq = function tree_seq(branch_QMARK_, children, root) {
  var walk__8225 = function walk(node) {
    return new cljs.core.LazySeq(null, false, function() {
      return cljs.core.cons.call(null, node, cljs.core.truth_(branch_QMARK_.call(null, node)) ? cljs.core.mapcat.call(null, walk, children.call(null, node)) : null)
    }, null)
  };
  return walk__8225.call(null, root)
};
cljs.core.flatten = function flatten(x) {
  return cljs.core.filter.call(null, function(p1__8223_SHARP_) {
    return!cljs.core.sequential_QMARK_.call(null, p1__8223_SHARP_)
  }, cljs.core.rest.call(null, cljs.core.tree_seq.call(null, cljs.core.sequential_QMARK_, cljs.core.seq, x)))
};
cljs.core.into = function into(to, from) {
  if(function() {
    var G__8229__8230 = to;
    if(G__8229__8230) {
      if(function() {
        var or__3824__auto____8231 = G__8229__8230.cljs$lang$protocol_mask$partition1$ & 1;
        if(or__3824__auto____8231) {
          return or__3824__auto____8231
        }else {
          return G__8229__8230.cljs$core$IEditableCollection$
        }
      }()) {
        return true
      }else {
        if(!G__8229__8230.cljs$lang$protocol_mask$partition1$) {
          return cljs.core.type_satisfies_.call(null, cljs.core.IEditableCollection, G__8229__8230)
        }else {
          return false
        }
      }
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.IEditableCollection, G__8229__8230)
    }
  }()) {
    return cljs.core.persistent_BANG_.call(null, cljs.core.reduce.call(null, cljs.core._conj_BANG_, cljs.core.transient$.call(null, to), from))
  }else {
    return cljs.core.reduce.call(null, cljs.core._conj, to, from)
  }
};
cljs.core.mapv = function() {
  var mapv = null;
  var mapv__2 = function(f, coll) {
    return cljs.core.persistent_BANG_.call(null, cljs.core.reduce.call(null, function(v, o) {
      return cljs.core.conj_BANG_.call(null, v, f.call(null, o))
    }, cljs.core.transient$.call(null, cljs.core.PersistentVector.EMPTY), coll))
  };
  var mapv__3 = function(f, c1, c2) {
    return cljs.core.into.call(null, cljs.core.PersistentVector.EMPTY, cljs.core.map.call(null, f, c1, c2))
  };
  var mapv__4 = function(f, c1, c2, c3) {
    return cljs.core.into.call(null, cljs.core.PersistentVector.EMPTY, cljs.core.map.call(null, f, c1, c2, c3))
  };
  var mapv__5 = function() {
    var G__8232__delegate = function(f, c1, c2, c3, colls) {
      return cljs.core.into.call(null, cljs.core.PersistentVector.EMPTY, cljs.core.apply.call(null, cljs.core.map, f, c1, c2, c3, colls))
    };
    var G__8232 = function(f, c1, c2, c3, var_args) {
      var colls = null;
      if(goog.isDef(var_args)) {
        colls = cljs.core.array_seq(Array.prototype.slice.call(arguments, 4), 0)
      }
      return G__8232__delegate.call(this, f, c1, c2, c3, colls)
    };
    G__8232.cljs$lang$maxFixedArity = 4;
    G__8232.cljs$lang$applyTo = function(arglist__8233) {
      var f = cljs.core.first(arglist__8233);
      var c1 = cljs.core.first(cljs.core.next(arglist__8233));
      var c2 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8233)));
      var c3 = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__8233))));
      var colls = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(arglist__8233))));
      return G__8232__delegate(f, c1, c2, c3, colls)
    };
    G__8232.cljs$lang$arity$variadic = G__8232__delegate;
    return G__8232
  }();
  mapv = function(f, c1, c2, c3, var_args) {
    var colls = var_args;
    switch(arguments.length) {
      case 2:
        return mapv__2.call(this, f, c1);
      case 3:
        return mapv__3.call(this, f, c1, c2);
      case 4:
        return mapv__4.call(this, f, c1, c2, c3);
      default:
        return mapv__5.cljs$lang$arity$variadic(f, c1, c2, c3, cljs.core.array_seq(arguments, 4))
    }
    throw"Invalid arity: " + arguments.length;
  };
  mapv.cljs$lang$maxFixedArity = 4;
  mapv.cljs$lang$applyTo = mapv__5.cljs$lang$applyTo;
  mapv.cljs$lang$arity$2 = mapv__2;
  mapv.cljs$lang$arity$3 = mapv__3;
  mapv.cljs$lang$arity$4 = mapv__4;
  mapv.cljs$lang$arity$variadic = mapv__5.cljs$lang$arity$variadic;
  return mapv
}();
cljs.core.filterv = function filterv(pred, coll) {
  return cljs.core.persistent_BANG_.call(null, cljs.core.reduce.call(null, function(v, o) {
    if(cljs.core.truth_(pred.call(null, o))) {
      return cljs.core.conj_BANG_.call(null, v, o)
    }else {
      return v
    }
  }, cljs.core.transient$.call(null, cljs.core.PersistentVector.EMPTY), coll))
};
cljs.core.partition = function() {
  var partition = null;
  var partition__2 = function(n, coll) {
    return partition.call(null, n, n, coll)
  };
  var partition__3 = function(n, step, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____8240 = cljs.core.seq.call(null, coll);
      if(temp__3974__auto____8240) {
        var s__8241 = temp__3974__auto____8240;
        var p__8242 = cljs.core.take.call(null, n, s__8241);
        if(n === cljs.core.count.call(null, p__8242)) {
          return cljs.core.cons.call(null, p__8242, partition.call(null, n, step, cljs.core.drop.call(null, step, s__8241)))
        }else {
          return null
        }
      }else {
        return null
      }
    }, null)
  };
  var partition__4 = function(n, step, pad, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____8243 = cljs.core.seq.call(null, coll);
      if(temp__3974__auto____8243) {
        var s__8244 = temp__3974__auto____8243;
        var p__8245 = cljs.core.take.call(null, n, s__8244);
        if(n === cljs.core.count.call(null, p__8245)) {
          return cljs.core.cons.call(null, p__8245, partition.call(null, n, step, pad, cljs.core.drop.call(null, step, s__8244)))
        }else {
          return cljs.core.list.call(null, cljs.core.take.call(null, n, cljs.core.concat.call(null, p__8245, pad)))
        }
      }else {
        return null
      }
    }, null)
  };
  partition = function(n, step, pad, coll) {
    switch(arguments.length) {
      case 2:
        return partition__2.call(this, n, step);
      case 3:
        return partition__3.call(this, n, step, pad);
      case 4:
        return partition__4.call(this, n, step, pad, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  partition.cljs$lang$arity$2 = partition__2;
  partition.cljs$lang$arity$3 = partition__3;
  partition.cljs$lang$arity$4 = partition__4;
  return partition
}();
cljs.core.get_in = function() {
  var get_in = null;
  var get_in__2 = function(m, ks) {
    return cljs.core.reduce.call(null, cljs.core.get, m, ks)
  };
  var get_in__3 = function(m, ks, not_found) {
    var sentinel__8250 = cljs.core.lookup_sentinel;
    var m__8251 = m;
    var ks__8252 = cljs.core.seq.call(null, ks);
    while(true) {
      if(ks__8252) {
        var m__8253 = cljs.core._lookup.call(null, m__8251, cljs.core.first.call(null, ks__8252), sentinel__8250);
        if(sentinel__8250 === m__8253) {
          return not_found
        }else {
          var G__8254 = sentinel__8250;
          var G__8255 = m__8253;
          var G__8256 = cljs.core.next.call(null, ks__8252);
          sentinel__8250 = G__8254;
          m__8251 = G__8255;
          ks__8252 = G__8256;
          continue
        }
      }else {
        return m__8251
      }
      break
    }
  };
  get_in = function(m, ks, not_found) {
    switch(arguments.length) {
      case 2:
        return get_in__2.call(this, m, ks);
      case 3:
        return get_in__3.call(this, m, ks, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  get_in.cljs$lang$arity$2 = get_in__2;
  get_in.cljs$lang$arity$3 = get_in__3;
  return get_in
}();
cljs.core.assoc_in = function assoc_in(m, p__8257, v) {
  var vec__8262__8263 = p__8257;
  var k__8264 = cljs.core.nth.call(null, vec__8262__8263, 0, null);
  var ks__8265 = cljs.core.nthnext.call(null, vec__8262__8263, 1);
  if(cljs.core.truth_(ks__8265)) {
    return cljs.core.assoc.call(null, m, k__8264, assoc_in.call(null, cljs.core._lookup.call(null, m, k__8264, null), ks__8265, v))
  }else {
    return cljs.core.assoc.call(null, m, k__8264, v)
  }
};
cljs.core.update_in = function() {
  var update_in__delegate = function(m, p__8266, f, args) {
    var vec__8271__8272 = p__8266;
    var k__8273 = cljs.core.nth.call(null, vec__8271__8272, 0, null);
    var ks__8274 = cljs.core.nthnext.call(null, vec__8271__8272, 1);
    if(cljs.core.truth_(ks__8274)) {
      return cljs.core.assoc.call(null, m, k__8273, cljs.core.apply.call(null, update_in, cljs.core._lookup.call(null, m, k__8273, null), ks__8274, f, args))
    }else {
      return cljs.core.assoc.call(null, m, k__8273, cljs.core.apply.call(null, f, cljs.core._lookup.call(null, m, k__8273, null), args))
    }
  };
  var update_in = function(m, p__8266, f, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
    }
    return update_in__delegate.call(this, m, p__8266, f, args)
  };
  update_in.cljs$lang$maxFixedArity = 3;
  update_in.cljs$lang$applyTo = function(arglist__8275) {
    var m = cljs.core.first(arglist__8275);
    var p__8266 = cljs.core.first(cljs.core.next(arglist__8275));
    var f = cljs.core.first(cljs.core.next(cljs.core.next(arglist__8275)));
    var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__8275)));
    return update_in__delegate(m, p__8266, f, args)
  };
  update_in.cljs$lang$arity$variadic = update_in__delegate;
  return update_in
}();
cljs.core.Vector = function(meta, array, __hash) {
  this.meta = meta;
  this.array = array;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32400159
};
cljs.core.Vector.cljs$lang$type = true;
cljs.core.Vector.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/Vector")
};
cljs.core.Vector.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__8278 = this;
  var h__2192__auto____8279 = this__8278.__hash;
  if(!(h__2192__auto____8279 == null)) {
    return h__2192__auto____8279
  }else {
    var h__2192__auto____8280 = cljs.core.hash_coll.call(null, coll);
    this__8278.__hash = h__2192__auto____8280;
    return h__2192__auto____8280
  }
};
cljs.core.Vector.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__8281 = this;
  return coll.cljs$core$IIndexed$_nth$arity$3(coll, k, null)
};
cljs.core.Vector.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__8282 = this;
  return coll.cljs$core$IIndexed$_nth$arity$3(coll, k, not_found)
};
cljs.core.Vector.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__8283 = this;
  var new_array__8284 = this__8283.array.slice();
  new_array__8284[k] = v;
  return new cljs.core.Vector(this__8283.meta, new_array__8284, null)
};
cljs.core.Vector.prototype.call = function() {
  var G__8315 = null;
  var G__8315__2 = function(this_sym8285, k) {
    var this__8287 = this;
    var this_sym8285__8288 = this;
    var coll__8289 = this_sym8285__8288;
    return coll__8289.cljs$core$ILookup$_lookup$arity$2(coll__8289, k)
  };
  var G__8315__3 = function(this_sym8286, k, not_found) {
    var this__8287 = this;
    var this_sym8286__8290 = this;
    var coll__8291 = this_sym8286__8290;
    return coll__8291.cljs$core$ILookup$_lookup$arity$3(coll__8291, k, not_found)
  };
  G__8315 = function(this_sym8286, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__8315__2.call(this, this_sym8286, k);
      case 3:
        return G__8315__3.call(this, this_sym8286, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__8315
}();
cljs.core.Vector.prototype.apply = function(this_sym8276, args8277) {
  var this__8292 = this;
  return this_sym8276.call.apply(this_sym8276, [this_sym8276].concat(args8277.slice()))
};
cljs.core.Vector.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__8293 = this;
  var new_array__8294 = this__8293.array.slice();
  new_array__8294.push(o);
  return new cljs.core.Vector(this__8293.meta, new_array__8294, null)
};
cljs.core.Vector.prototype.toString = function() {
  var this__8295 = this;
  var this__8296 = this;
  return cljs.core.pr_str.call(null, this__8296)
};
cljs.core.Vector.prototype.cljs$core$IReduce$_reduce$arity$2 = function(v, f) {
  var this__8297 = this;
  return cljs.core.ci_reduce.call(null, this__8297.array, f)
};
cljs.core.Vector.prototype.cljs$core$IReduce$_reduce$arity$3 = function(v, f, start) {
  var this__8298 = this;
  return cljs.core.ci_reduce.call(null, this__8298.array, f, start)
};
cljs.core.Vector.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__8299 = this;
  if(this__8299.array.length > 0) {
    var vector_seq__8300 = function vector_seq(i) {
      return new cljs.core.LazySeq(null, false, function() {
        if(i < this__8299.array.length) {
          return cljs.core.cons.call(null, this__8299.array[i], vector_seq.call(null, i + 1))
        }else {
          return null
        }
      }, null)
    };
    return vector_seq__8300.call(null, 0)
  }else {
    return null
  }
};
cljs.core.Vector.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__8301 = this;
  return this__8301.array.length
};
cljs.core.Vector.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var this__8302 = this;
  var count__8303 = this__8302.array.length;
  if(count__8303 > 0) {
    return this__8302.array[count__8303 - 1]
  }else {
    return null
  }
};
cljs.core.Vector.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var this__8304 = this;
  if(this__8304.array.length > 0) {
    var new_array__8305 = this__8304.array.slice();
    new_array__8305.pop();
    return new cljs.core.Vector(this__8304.meta, new_array__8305, null)
  }else {
    throw new Error("Can't pop empty vector");
  }
};
cljs.core.Vector.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(coll, n, val) {
  var this__8306 = this;
  return coll.cljs$core$IAssociative$_assoc$arity$3(coll, n, val)
};
cljs.core.Vector.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__8307 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.Vector.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__8308 = this;
  return new cljs.core.Vector(meta, this__8308.array, this__8308.__hash)
};
cljs.core.Vector.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__8309 = this;
  return this__8309.meta
};
cljs.core.Vector.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, n) {
  var this__8310 = this;
  if(function() {
    var and__3822__auto____8311 = 0 <= n;
    if(and__3822__auto____8311) {
      return n < this__8310.array.length
    }else {
      return and__3822__auto____8311
    }
  }()) {
    return this__8310.array[n]
  }else {
    return null
  }
};
cljs.core.Vector.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, n, not_found) {
  var this__8312 = this;
  if(function() {
    var and__3822__auto____8313 = 0 <= n;
    if(and__3822__auto____8313) {
      return n < this__8312.array.length
    }else {
      return and__3822__auto____8313
    }
  }()) {
    return this__8312.array[n]
  }else {
    return not_found
  }
};
cljs.core.Vector.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__8314 = this;
  return cljs.core.with_meta.call(null, cljs.core.Vector.EMPTY, this__8314.meta)
};
cljs.core.Vector;
cljs.core.Vector.EMPTY = new cljs.core.Vector(null, [], 0);
cljs.core.Vector.fromArray = function(xs) {
  return new cljs.core.Vector(null, xs, null)
};
cljs.core.VectorNode = function(edit, arr) {
  this.edit = edit;
  this.arr = arr
};
cljs.core.VectorNode.cljs$lang$type = true;
cljs.core.VectorNode.cljs$lang$ctorPrSeq = function(this__2310__auto__) {
  return cljs.core.list.call(null, "cljs.core/VectorNode")
};
cljs.core.VectorNode;
cljs.core.pv_fresh_node = function pv_fresh_node(edit) {
  return new cljs.core.VectorNode(edit, cljs.core.make_array.call(null, 32))
};
cljs.core.pv_aget = function pv_aget(node, idx) {
  return node.arr[idx]
};
cljs.core.pv_aset = function pv_aset(node, idx, val) {
  return node.arr[idx] = val
};
cljs.core.pv_clone_node = function pv_clone_node(node) {
  return new cljs.core.VectorNode(node.edit, node.arr.slice())
};
cljs.core.tail_off = function tail_off(pv) {
  var cnt__8317 = pv.cnt;
  if(cnt__8317 < 32) {
    return 0
  }else {
    return cnt__8317 - 1 >>> 5 << 5
  }
};
cljs.core.new_path = function new_path(edit, level, node) {
  var ll__8323 = level;
  var ret__8324 = node;
  while(true) {
    if(ll__8323 === 0) {
      return ret__8324
    }else {
      var embed__8325 = ret__8324;
      var r__8326 = cljs.core.pv_fresh_node.call(null, edit);
      var ___8327 = cljs.core.pv_aset.call(null, r__8326, 0, embed__8325);
      var G__8328 = ll__8323 - 5;
      var G__8329 = r__8326;
      ll__8323 = G__8328;
      ret__8324 = G__8329;
      continue
    }
    break
  }
};
cljs.core.push_tail = function push_tail(pv, level, parent, tailnode) {
  var ret__8335 = cljs.core.pv_clone_node.call(null, parent);
  var subidx__8336 = pv.cnt - 1 >>> level & 31;
  if(5 === level) {
    cljs.core.pv_aset.call(null, ret__8335, subidx__8336, tailnode);
    return ret__8335
  }else {
    var child__8337 = cljs.core.pv_aget.call(null, parent, subidx__8336);
    if(!(child__8337 == null)) {
      var node_to_insert__8338 = push_tail.call(null, pv, level - 5, child__8337, tailnode);
      cljs.core.pv_aset.call(null, ret__8335, subidx__8336, node_to_insert__8338);
      return ret__8335
    }else {
      var node_to_insert__8339 = cljs.core.new_path.call(null, null, level - 5, tailnode);
      cljs.core.pv_aset.call(null, ret__8335, subidx__8336, node_to_insert__8339);
      return ret__8335
    }
  }
};
cljs.core.array_for = function array_for(pv, i) {
  if(function() {
    var and__3822__auto____8343 = 0 <= i;
    if(and__3822__auto____8343) {
      return i < pv.cnt
    }else {
      return and__3822__auto____8343
    }
  }()) {
    if(i >= cljs.core.tail_off.call(null, pv)) {
      return pv.tail
    }else {
      var node__8344 = pv.root;
      var level__8345 = pv.shift;
      while(true) {
        if(level__8345 > 0) {
          var G__8346 = cljs.core.pv_aget.call(null, node__8344, i >>> level__8345 & 31);
          var G__8347 = level__8345 - 5;
          node__8344 = G__8346;
          level__8345 = G__8347;
          continue
        }else {
          return node__8344.arr
        }
        break
      }
    }
  }else {
    throw new Error([cljs.core.str("No item "), cljs.core.str(i), cljs.core.str(" in vector of length "), cljs.core.str(pv.cnt)].join(""));
  }
};
cljs.core.do_assoc = function do_assoc(pv, level, node, i, val) {
  var ret__8350 = cljs.core.pv_clone_node.call(null, node);
  if(level === 0) {
    cljs.core.pv_aset.call(null, ret__8350, i & 31, val);
    return ret__8350
  }else {
    var subidx__8351 = i >>> level & 31;
    cljs.core.pv_aset.call(null, ret__8350, subidx__8351, do_assoc.call(null, pv, level - 5, cljs.core.pv_aget.call(null, node, subidx__8351), i, val));
    return ret__8350
  }
};
cljs.core.pop_tail = function pop_tail(pv, level, node) {
  var subidx__8357 = pv.cnt - 2 >>> level & 31;
  if(level > 5) {
    var new_child__8358 = pop_tail.call(null, pv, level - 5, cljs.core.pv_aget.call(null, node, subidx__8357));
    if(function() {
      var and__3822__auto____8359 = new_child__8358 == null;
      if(and__3822__auto____8359) {
        return subidx__8357 === 0
      }else {
        return and__3822__auto____8359
      }
    }()) {
      return null
    }else {
      var ret__8360 = cljs.core.pv_clone_node.call(null, node);
      cljs.core.pv_aset.call(null, ret__8360, subidx__8357, new_child__8358);
      return ret__8360
    }
  }else {
    if(subidx__8357 === 0) {
      return null
    }else {
      if("\ufdd0'else") {
        var ret__8361 = cljs.core.pv_clone_node.call(null, node);
        cljs.core.pv_aset.call(null, ret__8361, subidx__8357, null);
        return ret__8361
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentVector = function(meta, cnt, shift, root, tail, __hash) {
  this.meta = meta;
  this.cnt = cnt;
  this.shift = shift;
  this.root = root;
  this.tail = tail;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 1;
  this.cljs$lang$protocol_mask$partition0$ = 167668511
};
cljs.core.PersistentVector.cljs$lang$type = true;
cljs.core.PersistentVector.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/PersistentVector")
};
cljs.core.PersistentVector.prototype.cljs$core$IEditableCollection$_as_transient$arity$1 = function(coll) {
  var this__8364 = this;
  return new cljs.core.TransientVector(this__8364.cnt, this__8364.shift, cljs.core.tv_editable_root.call(null, this__8364.root), cljs.core.tv_editable_tail.call(null, this__8364.tail))
};
cljs.core.PersistentVector.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__8365 = this;
  var h__2192__auto____8366 = this__8365.__hash;
  if(!(h__2192__auto____8366 == null)) {
    return h__2192__auto____8366
  }else {
    var h__2192__auto____8367 = cljs.core.hash_coll.call(null, coll);
    this__8365.__hash = h__2192__auto____8367;
    return h__2192__auto____8367
  }
};
cljs.core.PersistentVector.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__8368 = this;
  return coll.cljs$core$IIndexed$_nth$arity$3(coll, k, null)
};
cljs.core.PersistentVector.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__8369 = this;
  return coll.cljs$core$IIndexed$_nth$arity$3(coll, k, not_found)
};
cljs.core.PersistentVector.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__8370 = this;
  if(function() {
    var and__3822__auto____8371 = 0 <= k;
    if(and__3822__auto____8371) {
      return k < this__8370.cnt
    }else {
      return and__3822__auto____8371
    }
  }()) {
    if(cljs.core.tail_off.call(null, coll) <= k) {
      var new_tail__8372 = this__8370.tail.slice();
      new_tail__8372[k & 31] = v;
      return new cljs.core.PersistentVector(this__8370.meta, this__8370.cnt, this__8370.shift, this__8370.root, new_tail__8372, null)
    }else {
      return new cljs.core.PersistentVector(this__8370.meta, this__8370.cnt, this__8370.shift, cljs.core.do_assoc.call(null, coll, this__8370.shift, this__8370.root, k, v), this__8370.tail, null)
    }
  }else {
    if(k === this__8370.cnt) {
      return coll.cljs$core$ICollection$_conj$arity$2(coll, v)
    }else {
      if("\ufdd0'else") {
        throw new Error([cljs.core.str("Index "), cljs.core.str(k), cljs.core.str(" out of bounds  [0,"), cljs.core.str(this__8370.cnt), cljs.core.str("]")].join(""));
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentVector.prototype.call = function() {
  var G__8420 = null;
  var G__8420__2 = function(this_sym8373, k) {
    var this__8375 = this;
    var this_sym8373__8376 = this;
    var coll__8377 = this_sym8373__8376;
    return coll__8377.cljs$core$ILookup$_lookup$arity$2(coll__8377, k)
  };
  var G__8420__3 = function(this_sym8374, k, not_found) {
    var this__8375 = this;
    var this_sym8374__8378 = this;
    var coll__8379 = this_sym8374__8378;
    return coll__8379.cljs$core$ILookup$_lookup$arity$3(coll__8379, k, not_found)
  };
  G__8420 = function(this_sym8374, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__8420__2.call(this, this_sym8374, k);
      case 3:
        return G__8420__3.call(this, this_sym8374, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__8420
}();
cljs.core.PersistentVector.prototype.apply = function(this_sym8362, args8363) {
  var this__8380 = this;
  return this_sym8362.call.apply(this_sym8362, [this_sym8362].concat(args8363.slice()))
};
cljs.core.PersistentVector.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = function(v, f, init) {
  var this__8381 = this;
  var step_init__8382 = [0, init];
  var i__8383 = 0;
  while(true) {
    if(i__8383 < this__8381.cnt) {
      var arr__8384 = cljs.core.array_for.call(null, v, i__8383);
      var len__8385 = arr__8384.length;
      var init__8389 = function() {
        var j__8386 = 0;
        var init__8387 = step_init__8382[1];
        while(true) {
          if(j__8386 < len__8385) {
            var init__8388 = f.call(null, init__8387, j__8386 + i__8383, arr__8384[j__8386]);
            if(cljs.core.reduced_QMARK_.call(null, init__8388)) {
              return init__8388
            }else {
              var G__8421 = j__8386 + 1;
              var G__8422 = init__8388;
              j__8386 = G__8421;
              init__8387 = G__8422;
              continue
            }
          }else {
            step_init__8382[0] = len__8385;
            step_init__8382[1] = init__8387;
            return init__8387
          }
          break
        }
      }();
      if(cljs.core.reduced_QMARK_.call(null, init__8389)) {
        return cljs.core.deref.call(null, init__8389)
      }else {
        var G__8423 = i__8383 + step_init__8382[0];
        i__8383 = G__8423;
        continue
      }
    }else {
      return step_init__8382[1]
    }
    break
  }
};
cljs.core.PersistentVector.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__8390 = this;
  if(this__8390.cnt - cljs.core.tail_off.call(null, coll) < 32) {
    var new_tail__8391 = this__8390.tail.slice();
    new_tail__8391.push(o);
    return new cljs.core.PersistentVector(this__8390.meta, this__8390.cnt + 1, this__8390.shift, this__8390.root, new_tail__8391, null)
  }else {
    var root_overflow_QMARK___8392 = this__8390.cnt >>> 5 > 1 << this__8390.shift;
    var new_shift__8393 = root_overflow_QMARK___8392 ? this__8390.shift + 5 : this__8390.shift;
    var new_root__8395 = root_overflow_QMARK___8392 ? function() {
      var n_r__8394 = cljs.core.pv_fresh_node.call(null, null);
      cljs.core.pv_aset.call(null, n_r__8394, 0, this__8390.root);
      cljs.core.pv_aset.call(null, n_r__8394, 1, cljs.core.new_path.call(null, null, this__8390.shift, new cljs.core.VectorNode(null, this__8390.tail)));
      return n_r__8394
    }() : cljs.core.push_tail.call(null, coll, this__8390.shift, this__8390.root, new cljs.core.VectorNode(null, this__8390.tail));
    return new cljs.core.PersistentVector(this__8390.meta, this__8390.cnt + 1, new_shift__8393, new_root__8395, [o], null)
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IReversible$_rseq$arity$1 = function(coll) {
  var this__8396 = this;
  if(this__8396.cnt > 0) {
    return new cljs.core.RSeq(coll, this__8396.cnt - 1, null)
  }else {
    return cljs.core.List.EMPTY
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IMapEntry$_key$arity$1 = function(coll) {
  var this__8397 = this;
  return coll.cljs$core$IIndexed$_nth$arity$2(coll, 0)
};
cljs.core.PersistentVector.prototype.cljs$core$IMapEntry$_val$arity$1 = function(coll) {
  var this__8398 = this;
  return coll.cljs$core$IIndexed$_nth$arity$2(coll, 1)
};
cljs.core.PersistentVector.prototype.toString = function() {
  var this__8399 = this;
  var this__8400 = this;
  return cljs.core.pr_str.call(null, this__8400)
};
cljs.core.PersistentVector.prototype.cljs$core$IReduce$_reduce$arity$2 = function(v, f) {
  var this__8401 = this;
  return cljs.core.ci_reduce.call(null, v, f)
};
cljs.core.PersistentVector.prototype.cljs$core$IReduce$_reduce$arity$3 = function(v, f, start) {
  var this__8402 = this;
  return cljs.core.ci_reduce.call(null, v, f, start)
};
cljs.core.PersistentVector.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__8403 = this;
  if(this__8403.cnt === 0) {
    return null
  }else {
    return cljs.core.chunked_seq.call(null, coll, 0, 0)
  }
};
cljs.core.PersistentVector.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__8404 = this;
  return this__8404.cnt
};
cljs.core.PersistentVector.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var this__8405 = this;
  if(this__8405.cnt > 0) {
    return coll.cljs$core$IIndexed$_nth$arity$2(coll, this__8405.cnt - 1)
  }else {
    return null
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var this__8406 = this;
  if(this__8406.cnt === 0) {
    throw new Error("Can't pop empty vector");
  }else {
    if(1 === this__8406.cnt) {
      return cljs.core._with_meta.call(null, cljs.core.PersistentVector.EMPTY, this__8406.meta)
    }else {
      if(1 < this__8406.cnt - cljs.core.tail_off.call(null, coll)) {
        return new cljs.core.PersistentVector(this__8406.meta, this__8406.cnt - 1, this__8406.shift, this__8406.root, this__8406.tail.slice(0, -1), null)
      }else {
        if("\ufdd0'else") {
          var new_tail__8407 = cljs.core.array_for.call(null, coll, this__8406.cnt - 2);
          var nr__8408 = cljs.core.pop_tail.call(null, coll, this__8406.shift, this__8406.root);
          var new_root__8409 = nr__8408 == null ? cljs.core.PersistentVector.EMPTY_NODE : nr__8408;
          var cnt_1__8410 = this__8406.cnt - 1;
          if(function() {
            var and__3822__auto____8411 = 5 < this__8406.shift;
            if(and__3822__auto____8411) {
              return cljs.core.pv_aget.call(null, new_root__8409, 1) == null
            }else {
              return and__3822__auto____8411
            }
          }()) {
            return new cljs.core.PersistentVector(this__8406.meta, cnt_1__8410, this__8406.shift - 5, cljs.core.pv_aget.call(null, new_root__8409, 0), new_tail__8407, null)
          }else {
            return new cljs.core.PersistentVector(this__8406.meta, cnt_1__8410, this__8406.shift, new_root__8409, new_tail__8407, null)
          }
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(coll, n, val) {
  var this__8412 = this;
  return coll.cljs$core$IAssociative$_assoc$arity$3(coll, n, val)
};
cljs.core.PersistentVector.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__8413 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.PersistentVector.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__8414 = this;
  return new cljs.core.PersistentVector(meta, this__8414.cnt, this__8414.shift, this__8414.root, this__8414.tail, this__8414.__hash)
};
cljs.core.PersistentVector.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__8415 = this;
  return this__8415.meta
};
cljs.core.PersistentVector.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, n) {
  var this__8416 = this;
  return cljs.core.array_for.call(null, coll, n)[n & 31]
};
cljs.core.PersistentVector.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, n, not_found) {
  var this__8417 = this;
  if(function() {
    var and__3822__auto____8418 = 0 <= n;
    if(and__3822__auto____8418) {
      return n < this__8417.cnt
    }else {
      return and__3822__auto____8418
    }
  }()) {
    return coll.cljs$core$IIndexed$_nth$arity$2(coll, n)
  }else {
    return not_found
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__8419 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentVector.EMPTY, this__8419.meta)
};
cljs.core.PersistentVector;
cljs.core.PersistentVector.EMPTY_NODE = cljs.core.pv_fresh_node.call(null, null);
cljs.core.PersistentVector.EMPTY = new cljs.core.PersistentVector(null, 0, 5, cljs.core.PersistentVector.EMPTY_NODE, [], 0);
cljs.core.PersistentVector.fromArray = function(xs, no_clone) {
  var l__8424 = xs.length;
  var xs__8425 = no_clone === true ? xs : xs.slice();
  if(l__8424 < 32) {
    return new cljs.core.PersistentVector(null, l__8424, 5, cljs.core.PersistentVector.EMPTY_NODE, xs__8425, null)
  }else {
    var node__8426 = xs__8425.slice(0, 32);
    var v__8427 = new cljs.core.PersistentVector(null, 32, 5, cljs.core.PersistentVector.EMPTY_NODE, node__8426, null);
    var i__8428 = 32;
    var out__8429 = cljs.core._as_transient.call(null, v__8427);
    while(true) {
      if(i__8428 < l__8424) {
        var G__8430 = i__8428 + 1;
        var G__8431 = cljs.core.conj_BANG_.call(null, out__8429, xs__8425[i__8428]);
        i__8428 = G__8430;
        out__8429 = G__8431;
        continue
      }else {
        return cljs.core.persistent_BANG_.call(null, out__8429)
      }
      break
    }
  }
};
cljs.core.vec = function vec(coll) {
  return cljs.core._persistent_BANG_.call(null, cljs.core.reduce.call(null, cljs.core._conj_BANG_, cljs.core._as_transient.call(null, cljs.core.PersistentVector.EMPTY), coll))
};
cljs.core.vector = function() {
  var vector__delegate = function(args) {
    return cljs.core.vec.call(null, args)
  };
  var vector = function(var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return vector__delegate.call(this, args)
  };
  vector.cljs$lang$maxFixedArity = 0;
  vector.cljs$lang$applyTo = function(arglist__8432) {
    var args = cljs.core.seq(arglist__8432);
    return vector__delegate(args)
  };
  vector.cljs$lang$arity$variadic = vector__delegate;
  return vector
}();
cljs.core.ChunkedSeq = function(vec, node, i, off, meta) {
  this.vec = vec;
  this.node = node;
  this.i = i;
  this.off = off;
  this.meta = meta;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 27525356
};
cljs.core.ChunkedSeq.cljs$lang$type = true;
cljs.core.ChunkedSeq.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/ChunkedSeq")
};
cljs.core.ChunkedSeq.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var this__8433 = this;
  if(this__8433.off + 1 < this__8433.node.length) {
    var s__8434 = cljs.core.chunked_seq.call(null, this__8433.vec, this__8433.node, this__8433.i, this__8433.off + 1);
    if(s__8434 == null) {
      return null
    }else {
      return s__8434
    }
  }else {
    return coll.cljs$core$IChunkedNext$_chunked_next$arity$1(coll)
  }
};
cljs.core.ChunkedSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__8435 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.ChunkedSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__8436 = this;
  return coll
};
cljs.core.ChunkedSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__8437 = this;
  return this__8437.node[this__8437.off]
};
cljs.core.ChunkedSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__8438 = this;
  if(this__8438.off + 1 < this__8438.node.length) {
    var s__8439 = cljs.core.chunked_seq.call(null, this__8438.vec, this__8438.node, this__8438.i, this__8438.off + 1);
    if(s__8439 == null) {
      return cljs.core.List.EMPTY
    }else {
      return s__8439
    }
  }else {
    return coll.cljs$core$IChunkedSeq$_chunked_rest$arity$1(coll)
  }
};
cljs.core.ChunkedSeq.prototype.cljs$core$IChunkedNext$ = true;
cljs.core.ChunkedSeq.prototype.cljs$core$IChunkedNext$_chunked_next$arity$1 = function(coll) {
  var this__8440 = this;
  var l__8441 = this__8440.node.length;
  var s__8442 = this__8440.i + l__8441 < cljs.core._count.call(null, this__8440.vec) ? cljs.core.chunked_seq.call(null, this__8440.vec, this__8440.i + l__8441, 0) : null;
  if(s__8442 == null) {
    return null
  }else {
    return s__8442
  }
};
cljs.core.ChunkedSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__8443 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.ChunkedSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, m) {
  var this__8444 = this;
  return cljs.core.chunked_seq.call(null, this__8444.vec, this__8444.node, this__8444.i, this__8444.off, m)
};
cljs.core.ChunkedSeq.prototype.cljs$core$IWithMeta$_meta$arity$1 = function(coll) {
  var this__8445 = this;
  return this__8445.meta
};
cljs.core.ChunkedSeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__8446 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentVector.EMPTY, this__8446.meta)
};
cljs.core.ChunkedSeq.prototype.cljs$core$IChunkedSeq$ = true;
cljs.core.ChunkedSeq.prototype.cljs$core$IChunkedSeq$_chunked_first$arity$1 = function(coll) {
  var this__8447 = this;
  return cljs.core.array_chunk.call(null, this__8447.node, this__8447.off)
};
cljs.core.ChunkedSeq.prototype.cljs$core$IChunkedSeq$_chunked_rest$arity$1 = function(coll) {
  var this__8448 = this;
  var l__8449 = this__8448.node.length;
  var s__8450 = this__8448.i + l__8449 < cljs.core._count.call(null, this__8448.vec) ? cljs.core.chunked_seq.call(null, this__8448.vec, this__8448.i + l__8449, 0) : null;
  if(s__8450 == null) {
    return cljs.core.List.EMPTY
  }else {
    return s__8450
  }
};
cljs.core.ChunkedSeq;
cljs.core.chunked_seq = function() {
  var chunked_seq = null;
  var chunked_seq__3 = function(vec, i, off) {
    return chunked_seq.call(null, vec, cljs.core.array_for.call(null, vec, i), i, off, null)
  };
  var chunked_seq__4 = function(vec, node, i, off) {
    return chunked_seq.call(null, vec, node, i, off, null)
  };
  var chunked_seq__5 = function(vec, node, i, off, meta) {
    return new cljs.core.ChunkedSeq(vec, node, i, off, meta)
  };
  chunked_seq = function(vec, node, i, off, meta) {
    switch(arguments.length) {
      case 3:
        return chunked_seq__3.call(this, vec, node, i);
      case 4:
        return chunked_seq__4.call(this, vec, node, i, off);
      case 5:
        return chunked_seq__5.call(this, vec, node, i, off, meta)
    }
    throw"Invalid arity: " + arguments.length;
  };
  chunked_seq.cljs$lang$arity$3 = chunked_seq__3;
  chunked_seq.cljs$lang$arity$4 = chunked_seq__4;
  chunked_seq.cljs$lang$arity$5 = chunked_seq__5;
  return chunked_seq
}();
cljs.core.Subvec = function(meta, v, start, end, __hash) {
  this.meta = meta;
  this.v = v;
  this.start = start;
  this.end = end;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32400159
};
cljs.core.Subvec.cljs$lang$type = true;
cljs.core.Subvec.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/Subvec")
};
cljs.core.Subvec.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__8453 = this;
  var h__2192__auto____8454 = this__8453.__hash;
  if(!(h__2192__auto____8454 == null)) {
    return h__2192__auto____8454
  }else {
    var h__2192__auto____8455 = cljs.core.hash_coll.call(null, coll);
    this__8453.__hash = h__2192__auto____8455;
    return h__2192__auto____8455
  }
};
cljs.core.Subvec.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__8456 = this;
  return coll.cljs$core$IIndexed$_nth$arity$3(coll, k, null)
};
cljs.core.Subvec.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__8457 = this;
  return coll.cljs$core$IIndexed$_nth$arity$3(coll, k, not_found)
};
cljs.core.Subvec.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, key, val) {
  var this__8458 = this;
  var v_pos__8459 = this__8458.start + key;
  return new cljs.core.Subvec(this__8458.meta, cljs.core._assoc.call(null, this__8458.v, v_pos__8459, val), this__8458.start, this__8458.end > v_pos__8459 + 1 ? this__8458.end : v_pos__8459 + 1, null)
};
cljs.core.Subvec.prototype.call = function() {
  var G__8485 = null;
  var G__8485__2 = function(this_sym8460, k) {
    var this__8462 = this;
    var this_sym8460__8463 = this;
    var coll__8464 = this_sym8460__8463;
    return coll__8464.cljs$core$ILookup$_lookup$arity$2(coll__8464, k)
  };
  var G__8485__3 = function(this_sym8461, k, not_found) {
    var this__8462 = this;
    var this_sym8461__8465 = this;
    var coll__8466 = this_sym8461__8465;
    return coll__8466.cljs$core$ILookup$_lookup$arity$3(coll__8466, k, not_found)
  };
  G__8485 = function(this_sym8461, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__8485__2.call(this, this_sym8461, k);
      case 3:
        return G__8485__3.call(this, this_sym8461, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__8485
}();
cljs.core.Subvec.prototype.apply = function(this_sym8451, args8452) {
  var this__8467 = this;
  return this_sym8451.call.apply(this_sym8451, [this_sym8451].concat(args8452.slice()))
};
cljs.core.Subvec.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__8468 = this;
  return new cljs.core.Subvec(this__8468.meta, cljs.core._assoc_n.call(null, this__8468.v, this__8468.end, o), this__8468.start, this__8468.end + 1, null)
};
cljs.core.Subvec.prototype.toString = function() {
  var this__8469 = this;
  var this__8470 = this;
  return cljs.core.pr_str.call(null, this__8470)
};
cljs.core.Subvec.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var this__8471 = this;
  return cljs.core.ci_reduce.call(null, coll, f)
};
cljs.core.Subvec.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var this__8472 = this;
  return cljs.core.ci_reduce.call(null, coll, f, start)
};
cljs.core.Subvec.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__8473 = this;
  var subvec_seq__8474 = function subvec_seq(i) {
    if(i === this__8473.end) {
      return null
    }else {
      return cljs.core.cons.call(null, cljs.core._nth.call(null, this__8473.v, i), new cljs.core.LazySeq(null, false, function() {
        return subvec_seq.call(null, i + 1)
      }, null))
    }
  };
  return subvec_seq__8474.call(null, this__8473.start)
};
cljs.core.Subvec.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__8475 = this;
  return this__8475.end - this__8475.start
};
cljs.core.Subvec.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var this__8476 = this;
  return cljs.core._nth.call(null, this__8476.v, this__8476.end - 1)
};
cljs.core.Subvec.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var this__8477 = this;
  if(this__8477.start === this__8477.end) {
    throw new Error("Can't pop empty vector");
  }else {
    return new cljs.core.Subvec(this__8477.meta, this__8477.v, this__8477.start, this__8477.end - 1, null)
  }
};
cljs.core.Subvec.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(coll, n, val) {
  var this__8478 = this;
  return coll.cljs$core$IAssociative$_assoc$arity$3(coll, n, val)
};
cljs.core.Subvec.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__8479 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.Subvec.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__8480 = this;
  return new cljs.core.Subvec(meta, this__8480.v, this__8480.start, this__8480.end, this__8480.__hash)
};
cljs.core.Subvec.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__8481 = this;
  return this__8481.meta
};
cljs.core.Subvec.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, n) {
  var this__8482 = this;
  return cljs.core._nth.call(null, this__8482.v, this__8482.start + n)
};
cljs.core.Subvec.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, n, not_found) {
  var this__8483 = this;
  return cljs.core._nth.call(null, this__8483.v, this__8483.start + n, not_found)
};
cljs.core.Subvec.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__8484 = this;
  return cljs.core.with_meta.call(null, cljs.core.Vector.EMPTY, this__8484.meta)
};
cljs.core.Subvec;
cljs.core.subvec = function() {
  var subvec = null;
  var subvec__2 = function(v, start) {
    return subvec.call(null, v, start, cljs.core.count.call(null, v))
  };
  var subvec__3 = function(v, start, end) {
    return new cljs.core.Subvec(null, v, start, end, null)
  };
  subvec = function(v, start, end) {
    switch(arguments.length) {
      case 2:
        return subvec__2.call(this, v, start);
      case 3:
        return subvec__3.call(this, v, start, end)
    }
    throw"Invalid arity: " + arguments.length;
  };
  subvec.cljs$lang$arity$2 = subvec__2;
  subvec.cljs$lang$arity$3 = subvec__3;
  return subvec
}();
cljs.core.tv_ensure_editable = function tv_ensure_editable(edit, node) {
  if(edit === node.edit) {
    return node
  }else {
    return new cljs.core.VectorNode(edit, node.arr.slice())
  }
};
cljs.core.tv_editable_root = function tv_editable_root(node) {
  return new cljs.core.VectorNode({}, node.arr.slice())
};
cljs.core.tv_editable_tail = function tv_editable_tail(tl) {
  var ret__8487 = cljs.core.make_array.call(null, 32);
  cljs.core.array_copy.call(null, tl, 0, ret__8487, 0, tl.length);
  return ret__8487
};
cljs.core.tv_push_tail = function tv_push_tail(tv, level, parent, tail_node) {
  var ret__8491 = cljs.core.tv_ensure_editable.call(null, tv.root.edit, parent);
  var subidx__8492 = tv.cnt - 1 >>> level & 31;
  cljs.core.pv_aset.call(null, ret__8491, subidx__8492, level === 5 ? tail_node : function() {
    var child__8493 = cljs.core.pv_aget.call(null, ret__8491, subidx__8492);
    if(!(child__8493 == null)) {
      return tv_push_tail.call(null, tv, level - 5, child__8493, tail_node)
    }else {
      return cljs.core.new_path.call(null, tv.root.edit, level - 5, tail_node)
    }
  }());
  return ret__8491
};
cljs.core.tv_pop_tail = function tv_pop_tail(tv, level, node) {
  var node__8498 = cljs.core.tv_ensure_editable.call(null, tv.root.edit, node);
  var subidx__8499 = tv.cnt - 2 >>> level & 31;
  if(level > 5) {
    var new_child__8500 = tv_pop_tail.call(null, tv, level - 5, cljs.core.pv_aget.call(null, node__8498, subidx__8499));
    if(function() {
      var and__3822__auto____8501 = new_child__8500 == null;
      if(and__3822__auto____8501) {
        return subidx__8499 === 0
      }else {
        return and__3822__auto____8501
      }
    }()) {
      return null
    }else {
      cljs.core.pv_aset.call(null, node__8498, subidx__8499, new_child__8500);
      return node__8498
    }
  }else {
    if(subidx__8499 === 0) {
      return null
    }else {
      if("\ufdd0'else") {
        cljs.core.pv_aset.call(null, node__8498, subidx__8499, null);
        return node__8498
      }else {
        return null
      }
    }
  }
};
cljs.core.editable_array_for = function editable_array_for(tv, i) {
  if(function() {
    var and__3822__auto____8506 = 0 <= i;
    if(and__3822__auto____8506) {
      return i < tv.cnt
    }else {
      return and__3822__auto____8506
    }
  }()) {
    if(i >= cljs.core.tail_off.call(null, tv)) {
      return tv.tail
    }else {
      var root__8507 = tv.root;
      var node__8508 = root__8507;
      var level__8509 = tv.shift;
      while(true) {
        if(level__8509 > 0) {
          var G__8510 = cljs.core.tv_ensure_editable.call(null, root__8507.edit, cljs.core.pv_aget.call(null, node__8508, i >>> level__8509 & 31));
          var G__8511 = level__8509 - 5;
          node__8508 = G__8510;
          level__8509 = G__8511;
          continue
        }else {
          return node__8508.arr
        }
        break
      }
    }
  }else {
    throw new Error([cljs.core.str("No item "), cljs.core.str(i), cljs.core.str(" in transient vector of length "), cljs.core.str(tv.cnt)].join(""));
  }
};
cljs.core.TransientVector = function(cnt, shift, root, tail) {
  this.cnt = cnt;
  this.shift = shift;
  this.root = root;
  this.tail = tail;
  this.cljs$lang$protocol_mask$partition0$ = 275;
  this.cljs$lang$protocol_mask$partition1$ = 22
};
cljs.core.TransientVector.cljs$lang$type = true;
cljs.core.TransientVector.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/TransientVector")
};
cljs.core.TransientVector.prototype.call = function() {
  var G__8551 = null;
  var G__8551__2 = function(this_sym8514, k) {
    var this__8516 = this;
    var this_sym8514__8517 = this;
    var coll__8518 = this_sym8514__8517;
    return coll__8518.cljs$core$ILookup$_lookup$arity$2(coll__8518, k)
  };
  var G__8551__3 = function(this_sym8515, k, not_found) {
    var this__8516 = this;
    var this_sym8515__8519 = this;
    var coll__8520 = this_sym8515__8519;
    return coll__8520.cljs$core$ILookup$_lookup$arity$3(coll__8520, k, not_found)
  };
  G__8551 = function(this_sym8515, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__8551__2.call(this, this_sym8515, k);
      case 3:
        return G__8551__3.call(this, this_sym8515, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__8551
}();
cljs.core.TransientVector.prototype.apply = function(this_sym8512, args8513) {
  var this__8521 = this;
  return this_sym8512.call.apply(this_sym8512, [this_sym8512].concat(args8513.slice()))
};
cljs.core.TransientVector.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__8522 = this;
  return coll.cljs$core$IIndexed$_nth$arity$3(coll, k, null)
};
cljs.core.TransientVector.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__8523 = this;
  return coll.cljs$core$IIndexed$_nth$arity$3(coll, k, not_found)
};
cljs.core.TransientVector.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, n) {
  var this__8524 = this;
  if(this__8524.root.edit) {
    return cljs.core.array_for.call(null, coll, n)[n & 31]
  }else {
    throw new Error("nth after persistent!");
  }
};
cljs.core.TransientVector.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, n, not_found) {
  var this__8525 = this;
  if(function() {
    var and__3822__auto____8526 = 0 <= n;
    if(and__3822__auto____8526) {
      return n < this__8525.cnt
    }else {
      return and__3822__auto____8526
    }
  }()) {
    return coll.cljs$core$IIndexed$_nth$arity$2(coll, n)
  }else {
    return not_found
  }
};
cljs.core.TransientVector.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__8527 = this;
  if(this__8527.root.edit) {
    return this__8527.cnt
  }else {
    throw new Error("count after persistent!");
  }
};
cljs.core.TransientVector.prototype.cljs$core$ITransientVector$_assoc_n_BANG_$arity$3 = function(tcoll, n, val) {
  var this__8528 = this;
  if(this__8528.root.edit) {
    if(function() {
      var and__3822__auto____8529 = 0 <= n;
      if(and__3822__auto____8529) {
        return n < this__8528.cnt
      }else {
        return and__3822__auto____8529
      }
    }()) {
      if(cljs.core.tail_off.call(null, tcoll) <= n) {
        this__8528.tail[n & 31] = val;
        return tcoll
      }else {
        var new_root__8534 = function go(level, node) {
          var node__8532 = cljs.core.tv_ensure_editable.call(null, this__8528.root.edit, node);
          if(level === 0) {
            cljs.core.pv_aset.call(null, node__8532, n & 31, val);
            return node__8532
          }else {
            var subidx__8533 = n >>> level & 31;
            cljs.core.pv_aset.call(null, node__8532, subidx__8533, go.call(null, level - 5, cljs.core.pv_aget.call(null, node__8532, subidx__8533)));
            return node__8532
          }
        }.call(null, this__8528.shift, this__8528.root);
        this__8528.root = new_root__8534;
        return tcoll
      }
    }else {
      if(n === this__8528.cnt) {
        return tcoll.cljs$core$ITransientCollection$_conj_BANG_$arity$2(tcoll, val)
      }else {
        if("\ufdd0'else") {
          throw new Error([cljs.core.str("Index "), cljs.core.str(n), cljs.core.str(" out of bounds for TransientVector of length"), cljs.core.str(this__8528.cnt)].join(""));
        }else {
          return null
        }
      }
    }
  }else {
    throw new Error("assoc! after persistent!");
  }
};
cljs.core.TransientVector.prototype.cljs$core$ITransientVector$_pop_BANG_$arity$1 = function(tcoll) {
  var this__8535 = this;
  if(this__8535.root.edit) {
    if(this__8535.cnt === 0) {
      throw new Error("Can't pop empty vector");
    }else {
      if(1 === this__8535.cnt) {
        this__8535.cnt = 0;
        return tcoll
      }else {
        if((this__8535.cnt - 1 & 31) > 0) {
          this__8535.cnt = this__8535.cnt - 1;
          return tcoll
        }else {
          if("\ufdd0'else") {
            var new_tail__8536 = cljs.core.editable_array_for.call(null, tcoll, this__8535.cnt - 2);
            var new_root__8538 = function() {
              var nr__8537 = cljs.core.tv_pop_tail.call(null, tcoll, this__8535.shift, this__8535.root);
              if(!(nr__8537 == null)) {
                return nr__8537
              }else {
                return new cljs.core.VectorNode(this__8535.root.edit, cljs.core.make_array.call(null, 32))
              }
            }();
            if(function() {
              var and__3822__auto____8539 = 5 < this__8535.shift;
              if(and__3822__auto____8539) {
                return cljs.core.pv_aget.call(null, new_root__8538, 1) == null
              }else {
                return and__3822__auto____8539
              }
            }()) {
              var new_root__8540 = cljs.core.tv_ensure_editable.call(null, this__8535.root.edit, cljs.core.pv_aget.call(null, new_root__8538, 0));
              this__8535.root = new_root__8540;
              this__8535.shift = this__8535.shift - 5;
              this__8535.cnt = this__8535.cnt - 1;
              this__8535.tail = new_tail__8536;
              return tcoll
            }else {
              this__8535.root = new_root__8538;
              this__8535.cnt = this__8535.cnt - 1;
              this__8535.tail = new_tail__8536;
              return tcoll
            }
          }else {
            return null
          }
        }
      }
    }
  }else {
    throw new Error("pop! after persistent!");
  }
};
cljs.core.TransientVector.prototype.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3 = function(tcoll, key, val) {
  var this__8541 = this;
  return tcoll.cljs$core$ITransientVector$_assoc_n_BANG_$arity$3(tcoll, key, val)
};
cljs.core.TransientVector.prototype.cljs$core$ITransientCollection$_conj_BANG_$arity$2 = function(tcoll, o) {
  var this__8542 = this;
  if(this__8542.root.edit) {
    if(this__8542.cnt - cljs.core.tail_off.call(null, tcoll) < 32) {
      this__8542.tail[this__8542.cnt & 31] = o;
      this__8542.cnt = this__8542.cnt + 1;
      return tcoll
    }else {
      var tail_node__8543 = new cljs.core.VectorNode(this__8542.root.edit, this__8542.tail);
      var new_tail__8544 = cljs.core.make_array.call(null, 32);
      new_tail__8544[0] = o;
      this__8542.tail = new_tail__8544;
      if(this__8542.cnt >>> 5 > 1 << this__8542.shift) {
        var new_root_array__8545 = cljs.core.make_array.call(null, 32);
        var new_shift__8546 = this__8542.shift + 5;
        new_root_array__8545[0] = this__8542.root;
        new_root_array__8545[1] = cljs.core.new_path.call(null, this__8542.root.edit, this__8542.shift, tail_node__8543);
        this__8542.root = new cljs.core.VectorNode(this__8542.root.edit, new_root_array__8545);
        this__8542.shift = new_shift__8546;
        this__8542.cnt = this__8542.cnt + 1;
        return tcoll
      }else {
        var new_root__8547 = cljs.core.tv_push_tail.call(null, tcoll, this__8542.shift, this__8542.root, tail_node__8543);
        this__8542.root = new_root__8547;
        this__8542.cnt = this__8542.cnt + 1;
        return tcoll
      }
    }
  }else {
    throw new Error("conj! after persistent!");
  }
};
cljs.core.TransientVector.prototype.cljs$core$ITransientCollection$_persistent_BANG_$arity$1 = function(tcoll) {
  var this__8548 = this;
  if(this__8548.root.edit) {
    this__8548.root.edit = null;
    var len__8549 = this__8548.cnt - cljs.core.tail_off.call(null, tcoll);
    var trimmed_tail__8550 = cljs.core.make_array.call(null, len__8549);
    cljs.core.array_copy.call(null, this__8548.tail, 0, trimmed_tail__8550, 0, len__8549);
    return new cljs.core.PersistentVector(null, this__8548.cnt, this__8548.shift, this__8548.root, trimmed_tail__8550, null)
  }else {
    throw new Error("persistent! called twice");
  }
};
cljs.core.TransientVector;
cljs.core.PersistentQueueSeq = function(meta, front, rear, __hash) {
  this.meta = meta;
  this.front = front;
  this.rear = rear;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 31850572
};
cljs.core.PersistentQueueSeq.cljs$lang$type = true;
cljs.core.PersistentQueueSeq.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/PersistentQueueSeq")
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__8552 = this;
  var h__2192__auto____8553 = this__8552.__hash;
  if(!(h__2192__auto____8553 == null)) {
    return h__2192__auto____8553
  }else {
    var h__2192__auto____8554 = cljs.core.hash_coll.call(null, coll);
    this__8552.__hash = h__2192__auto____8554;
    return h__2192__auto____8554
  }
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__8555 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.PersistentQueueSeq.prototype.toString = function() {
  var this__8556 = this;
  var this__8557 = this;
  return cljs.core.pr_str.call(null, this__8557)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__8558 = this;
  return coll
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__8559 = this;
  return cljs.core._first.call(null, this__8559.front)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__8560 = this;
  var temp__3971__auto____8561 = cljs.core.next.call(null, this__8560.front);
  if(temp__3971__auto____8561) {
    var f1__8562 = temp__3971__auto____8561;
    return new cljs.core.PersistentQueueSeq(this__8560.meta, f1__8562, this__8560.rear, null)
  }else {
    if(this__8560.rear == null) {
      return coll.cljs$core$IEmptyableCollection$_empty$arity$1(coll)
    }else {
      return new cljs.core.PersistentQueueSeq(this__8560.meta, this__8560.rear, null, null)
    }
  }
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__8563 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__8564 = this;
  return new cljs.core.PersistentQueueSeq(meta, this__8564.front, this__8564.rear, this__8564.__hash)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__8565 = this;
  return this__8565.meta
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__8566 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__8566.meta)
};
cljs.core.PersistentQueueSeq;
cljs.core.PersistentQueue = function(meta, count, front, rear, __hash) {
  this.meta = meta;
  this.count = count;
  this.front = front;
  this.rear = rear;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 31858766
};
cljs.core.PersistentQueue.cljs$lang$type = true;
cljs.core.PersistentQueue.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/PersistentQueue")
};
cljs.core.PersistentQueue.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__8567 = this;
  var h__2192__auto____8568 = this__8567.__hash;
  if(!(h__2192__auto____8568 == null)) {
    return h__2192__auto____8568
  }else {
    var h__2192__auto____8569 = cljs.core.hash_coll.call(null, coll);
    this__8567.__hash = h__2192__auto____8569;
    return h__2192__auto____8569
  }
};
cljs.core.PersistentQueue.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__8570 = this;
  if(cljs.core.truth_(this__8570.front)) {
    return new cljs.core.PersistentQueue(this__8570.meta, this__8570.count + 1, this__8570.front, cljs.core.conj.call(null, function() {
      var or__3824__auto____8571 = this__8570.rear;
      if(cljs.core.truth_(or__3824__auto____8571)) {
        return or__3824__auto____8571
      }else {
        return cljs.core.PersistentVector.EMPTY
      }
    }(), o), null)
  }else {
    return new cljs.core.PersistentQueue(this__8570.meta, this__8570.count + 1, cljs.core.conj.call(null, this__8570.front, o), cljs.core.PersistentVector.EMPTY, null)
  }
};
cljs.core.PersistentQueue.prototype.toString = function() {
  var this__8572 = this;
  var this__8573 = this;
  return cljs.core.pr_str.call(null, this__8573)
};
cljs.core.PersistentQueue.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__8574 = this;
  var rear__8575 = cljs.core.seq.call(null, this__8574.rear);
  if(cljs.core.truth_(function() {
    var or__3824__auto____8576 = this__8574.front;
    if(cljs.core.truth_(or__3824__auto____8576)) {
      return or__3824__auto____8576
    }else {
      return rear__8575
    }
  }())) {
    return new cljs.core.PersistentQueueSeq(null, this__8574.front, cljs.core.seq.call(null, rear__8575), null)
  }else {
    return null
  }
};
cljs.core.PersistentQueue.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__8577 = this;
  return this__8577.count
};
cljs.core.PersistentQueue.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var this__8578 = this;
  return cljs.core._first.call(null, this__8578.front)
};
cljs.core.PersistentQueue.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var this__8579 = this;
  if(cljs.core.truth_(this__8579.front)) {
    var temp__3971__auto____8580 = cljs.core.next.call(null, this__8579.front);
    if(temp__3971__auto____8580) {
      var f1__8581 = temp__3971__auto____8580;
      return new cljs.core.PersistentQueue(this__8579.meta, this__8579.count - 1, f1__8581, this__8579.rear, null)
    }else {
      return new cljs.core.PersistentQueue(this__8579.meta, this__8579.count - 1, cljs.core.seq.call(null, this__8579.rear), cljs.core.PersistentVector.EMPTY, null)
    }
  }else {
    return coll
  }
};
cljs.core.PersistentQueue.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__8582 = this;
  return cljs.core.first.call(null, this__8582.front)
};
cljs.core.PersistentQueue.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__8583 = this;
  return cljs.core.rest.call(null, cljs.core.seq.call(null, coll))
};
cljs.core.PersistentQueue.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__8584 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.PersistentQueue.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__8585 = this;
  return new cljs.core.PersistentQueue(meta, this__8585.count, this__8585.front, this__8585.rear, this__8585.__hash)
};
cljs.core.PersistentQueue.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__8586 = this;
  return this__8586.meta
};
cljs.core.PersistentQueue.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__8587 = this;
  return cljs.core.PersistentQueue.EMPTY
};
cljs.core.PersistentQueue;
cljs.core.PersistentQueue.EMPTY = new cljs.core.PersistentQueue(null, 0, null, cljs.core.PersistentVector.EMPTY, 0);
cljs.core.NeverEquiv = function() {
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 2097152
};
cljs.core.NeverEquiv.cljs$lang$type = true;
cljs.core.NeverEquiv.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/NeverEquiv")
};
cljs.core.NeverEquiv.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(o, other) {
  var this__8588 = this;
  return false
};
cljs.core.NeverEquiv;
cljs.core.never_equiv = new cljs.core.NeverEquiv;
cljs.core.equiv_map = function equiv_map(x, y) {
  return cljs.core.boolean$.call(null, cljs.core.map_QMARK_.call(null, y) ? cljs.core.count.call(null, x) === cljs.core.count.call(null, y) ? cljs.core.every_QMARK_.call(null, cljs.core.identity, cljs.core.map.call(null, function(xkv) {
    return cljs.core._EQ_.call(null, cljs.core._lookup.call(null, y, cljs.core.first.call(null, xkv), cljs.core.never_equiv), cljs.core.second.call(null, xkv))
  }, x)) : null : null)
};
cljs.core.scan_array = function scan_array(incr, k, array) {
  var len__8591 = array.length;
  var i__8592 = 0;
  while(true) {
    if(i__8592 < len__8591) {
      if(k === array[i__8592]) {
        return i__8592
      }else {
        var G__8593 = i__8592 + incr;
        i__8592 = G__8593;
        continue
      }
    }else {
      return null
    }
    break
  }
};
cljs.core.obj_map_compare_keys = function obj_map_compare_keys(a, b) {
  var a__8596 = cljs.core.hash.call(null, a);
  var b__8597 = cljs.core.hash.call(null, b);
  if(a__8596 < b__8597) {
    return-1
  }else {
    if(a__8596 > b__8597) {
      return 1
    }else {
      if("\ufdd0'else") {
        return 0
      }else {
        return null
      }
    }
  }
};
cljs.core.obj_map__GT_hash_map = function obj_map__GT_hash_map(m, k, v) {
  var ks__8605 = m.keys;
  var len__8606 = ks__8605.length;
  var so__8607 = m.strobj;
  var out__8608 = cljs.core.with_meta.call(null, cljs.core.PersistentHashMap.EMPTY, cljs.core.meta.call(null, m));
  var i__8609 = 0;
  var out__8610 = cljs.core.transient$.call(null, out__8608);
  while(true) {
    if(i__8609 < len__8606) {
      var k__8611 = ks__8605[i__8609];
      var G__8612 = i__8609 + 1;
      var G__8613 = cljs.core.assoc_BANG_.call(null, out__8610, k__8611, so__8607[k__8611]);
      i__8609 = G__8612;
      out__8610 = G__8613;
      continue
    }else {
      return cljs.core.persistent_BANG_.call(null, cljs.core.assoc_BANG_.call(null, out__8610, k, v))
    }
    break
  }
};
cljs.core.obj_clone = function obj_clone(obj, ks) {
  var new_obj__8619 = {};
  var l__8620 = ks.length;
  var i__8621 = 0;
  while(true) {
    if(i__8621 < l__8620) {
      var k__8622 = ks[i__8621];
      new_obj__8619[k__8622] = obj[k__8622];
      var G__8623 = i__8621 + 1;
      i__8621 = G__8623;
      continue
    }else {
    }
    break
  }
  return new_obj__8619
};
cljs.core.ObjMap = function(meta, keys, strobj, update_count, __hash) {
  this.meta = meta;
  this.keys = keys;
  this.strobj = strobj;
  this.update_count = update_count;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 1;
  this.cljs$lang$protocol_mask$partition0$ = 15075087
};
cljs.core.ObjMap.cljs$lang$type = true;
cljs.core.ObjMap.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/ObjMap")
};
cljs.core.ObjMap.prototype.cljs$core$IEditableCollection$_as_transient$arity$1 = function(coll) {
  var this__8626 = this;
  return cljs.core.transient$.call(null, cljs.core.into.call(null, cljs.core.hash_map.call(null), coll))
};
cljs.core.ObjMap.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__8627 = this;
  var h__2192__auto____8628 = this__8627.__hash;
  if(!(h__2192__auto____8628 == null)) {
    return h__2192__auto____8628
  }else {
    var h__2192__auto____8629 = cljs.core.hash_imap.call(null, coll);
    this__8627.__hash = h__2192__auto____8629;
    return h__2192__auto____8629
  }
};
cljs.core.ObjMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__8630 = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(coll, k, null)
};
cljs.core.ObjMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__8631 = this;
  if(function() {
    var and__3822__auto____8632 = goog.isString(k);
    if(and__3822__auto____8632) {
      return!(cljs.core.scan_array.call(null, 1, k, this__8631.keys) == null)
    }else {
      return and__3822__auto____8632
    }
  }()) {
    return this__8631.strobj[k]
  }else {
    return not_found
  }
};
cljs.core.ObjMap.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__8633 = this;
  if(goog.isString(k)) {
    if(function() {
      var or__3824__auto____8634 = this__8633.update_count > cljs.core.ObjMap.HASHMAP_THRESHOLD;
      if(or__3824__auto____8634) {
        return or__3824__auto____8634
      }else {
        return this__8633.keys.length >= cljs.core.ObjMap.HASHMAP_THRESHOLD
      }
    }()) {
      return cljs.core.obj_map__GT_hash_map.call(null, coll, k, v)
    }else {
      if(!(cljs.core.scan_array.call(null, 1, k, this__8633.keys) == null)) {
        var new_strobj__8635 = cljs.core.obj_clone.call(null, this__8633.strobj, this__8633.keys);
        new_strobj__8635[k] = v;
        return new cljs.core.ObjMap(this__8633.meta, this__8633.keys, new_strobj__8635, this__8633.update_count + 1, null)
      }else {
        var new_strobj__8636 = cljs.core.obj_clone.call(null, this__8633.strobj, this__8633.keys);
        var new_keys__8637 = this__8633.keys.slice();
        new_strobj__8636[k] = v;
        new_keys__8637.push(k);
        return new cljs.core.ObjMap(this__8633.meta, new_keys__8637, new_strobj__8636, this__8633.update_count + 1, null)
      }
    }
  }else {
    return cljs.core.obj_map__GT_hash_map.call(null, coll, k, v)
  }
};
cljs.core.ObjMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = function(coll, k) {
  var this__8638 = this;
  if(function() {
    var and__3822__auto____8639 = goog.isString(k);
    if(and__3822__auto____8639) {
      return!(cljs.core.scan_array.call(null, 1, k, this__8638.keys) == null)
    }else {
      return and__3822__auto____8639
    }
  }()) {
    return true
  }else {
    return false
  }
};
cljs.core.ObjMap.prototype.call = function() {
  var G__8661 = null;
  var G__8661__2 = function(this_sym8640, k) {
    var this__8642 = this;
    var this_sym8640__8643 = this;
    var coll__8644 = this_sym8640__8643;
    return coll__8644.cljs$core$ILookup$_lookup$arity$2(coll__8644, k)
  };
  var G__8661__3 = function(this_sym8641, k, not_found) {
    var this__8642 = this;
    var this_sym8641__8645 = this;
    var coll__8646 = this_sym8641__8645;
    return coll__8646.cljs$core$ILookup$_lookup$arity$3(coll__8646, k, not_found)
  };
  G__8661 = function(this_sym8641, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__8661__2.call(this, this_sym8641, k);
      case 3:
        return G__8661__3.call(this, this_sym8641, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__8661
}();
cljs.core.ObjMap.prototype.apply = function(this_sym8624, args8625) {
  var this__8647 = this;
  return this_sym8624.call.apply(this_sym8624, [this_sym8624].concat(args8625.slice()))
};
cljs.core.ObjMap.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, entry) {
  var this__8648 = this;
  if(cljs.core.vector_QMARK_.call(null, entry)) {
    return coll.cljs$core$IAssociative$_assoc$arity$3(coll, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1))
  }else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll, entry)
  }
};
cljs.core.ObjMap.prototype.toString = function() {
  var this__8649 = this;
  var this__8650 = this;
  return cljs.core.pr_str.call(null, this__8650)
};
cljs.core.ObjMap.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__8651 = this;
  if(this__8651.keys.length > 0) {
    return cljs.core.map.call(null, function(p1__8614_SHARP_) {
      return cljs.core.vector.call(null, p1__8614_SHARP_, this__8651.strobj[p1__8614_SHARP_])
    }, this__8651.keys.sort(cljs.core.obj_map_compare_keys))
  }else {
    return null
  }
};
cljs.core.ObjMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__8652 = this;
  return this__8652.keys.length
};
cljs.core.ObjMap.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__8653 = this;
  return cljs.core.equiv_map.call(null, coll, other)
};
cljs.core.ObjMap.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__8654 = this;
  return new cljs.core.ObjMap(meta, this__8654.keys, this__8654.strobj, this__8654.update_count, this__8654.__hash)
};
cljs.core.ObjMap.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__8655 = this;
  return this__8655.meta
};
cljs.core.ObjMap.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__8656 = this;
  return cljs.core.with_meta.call(null, cljs.core.ObjMap.EMPTY, this__8656.meta)
};
cljs.core.ObjMap.prototype.cljs$core$IMap$_dissoc$arity$2 = function(coll, k) {
  var this__8657 = this;
  if(function() {
    var and__3822__auto____8658 = goog.isString(k);
    if(and__3822__auto____8658) {
      return!(cljs.core.scan_array.call(null, 1, k, this__8657.keys) == null)
    }else {
      return and__3822__auto____8658
    }
  }()) {
    var new_keys__8659 = this__8657.keys.slice();
    var new_strobj__8660 = cljs.core.obj_clone.call(null, this__8657.strobj, this__8657.keys);
    new_keys__8659.splice(cljs.core.scan_array.call(null, 1, k, new_keys__8659), 1);
    cljs.core.js_delete.call(null, new_strobj__8660, k);
    return new cljs.core.ObjMap(this__8657.meta, new_keys__8659, new_strobj__8660, this__8657.update_count + 1, null)
  }else {
    return coll
  }
};
cljs.core.ObjMap;
cljs.core.ObjMap.EMPTY = new cljs.core.ObjMap(null, [], {}, 0, 0);
cljs.core.ObjMap.HASHMAP_THRESHOLD = 32;
cljs.core.ObjMap.fromObject = function(ks, obj) {
  return new cljs.core.ObjMap(null, ks, obj, 0, null)
};
cljs.core.HashMap = function(meta, count, hashobj, __hash) {
  this.meta = meta;
  this.count = count;
  this.hashobj = hashobj;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 15075087
};
cljs.core.HashMap.cljs$lang$type = true;
cljs.core.HashMap.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/HashMap")
};
cljs.core.HashMap.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__8665 = this;
  var h__2192__auto____8666 = this__8665.__hash;
  if(!(h__2192__auto____8666 == null)) {
    return h__2192__auto____8666
  }else {
    var h__2192__auto____8667 = cljs.core.hash_imap.call(null, coll);
    this__8665.__hash = h__2192__auto____8667;
    return h__2192__auto____8667
  }
};
cljs.core.HashMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__8668 = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(coll, k, null)
};
cljs.core.HashMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__8669 = this;
  var bucket__8670 = this__8669.hashobj[cljs.core.hash.call(null, k)];
  var i__8671 = cljs.core.truth_(bucket__8670) ? cljs.core.scan_array.call(null, 2, k, bucket__8670) : null;
  if(cljs.core.truth_(i__8671)) {
    return bucket__8670[i__8671 + 1]
  }else {
    return not_found
  }
};
cljs.core.HashMap.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__8672 = this;
  var h__8673 = cljs.core.hash.call(null, k);
  var bucket__8674 = this__8672.hashobj[h__8673];
  if(cljs.core.truth_(bucket__8674)) {
    var new_bucket__8675 = bucket__8674.slice();
    var new_hashobj__8676 = goog.object.clone(this__8672.hashobj);
    new_hashobj__8676[h__8673] = new_bucket__8675;
    var temp__3971__auto____8677 = cljs.core.scan_array.call(null, 2, k, new_bucket__8675);
    if(cljs.core.truth_(temp__3971__auto____8677)) {
      var i__8678 = temp__3971__auto____8677;
      new_bucket__8675[i__8678 + 1] = v;
      return new cljs.core.HashMap(this__8672.meta, this__8672.count, new_hashobj__8676, null)
    }else {
      new_bucket__8675.push(k, v);
      return new cljs.core.HashMap(this__8672.meta, this__8672.count + 1, new_hashobj__8676, null)
    }
  }else {
    var new_hashobj__8679 = goog.object.clone(this__8672.hashobj);
    new_hashobj__8679[h__8673] = [k, v];
    return new cljs.core.HashMap(this__8672.meta, this__8672.count + 1, new_hashobj__8679, null)
  }
};
cljs.core.HashMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = function(coll, k) {
  var this__8680 = this;
  var bucket__8681 = this__8680.hashobj[cljs.core.hash.call(null, k)];
  var i__8682 = cljs.core.truth_(bucket__8681) ? cljs.core.scan_array.call(null, 2, k, bucket__8681) : null;
  if(cljs.core.truth_(i__8682)) {
    return true
  }else {
    return false
  }
};
cljs.core.HashMap.prototype.call = function() {
  var G__8707 = null;
  var G__8707__2 = function(this_sym8683, k) {
    var this__8685 = this;
    var this_sym8683__8686 = this;
    var coll__8687 = this_sym8683__8686;
    return coll__8687.cljs$core$ILookup$_lookup$arity$2(coll__8687, k)
  };
  var G__8707__3 = function(this_sym8684, k, not_found) {
    var this__8685 = this;
    var this_sym8684__8688 = this;
    var coll__8689 = this_sym8684__8688;
    return coll__8689.cljs$core$ILookup$_lookup$arity$3(coll__8689, k, not_found)
  };
  G__8707 = function(this_sym8684, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__8707__2.call(this, this_sym8684, k);
      case 3:
        return G__8707__3.call(this, this_sym8684, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__8707
}();
cljs.core.HashMap.prototype.apply = function(this_sym8663, args8664) {
  var this__8690 = this;
  return this_sym8663.call.apply(this_sym8663, [this_sym8663].concat(args8664.slice()))
};
cljs.core.HashMap.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, entry) {
  var this__8691 = this;
  if(cljs.core.vector_QMARK_.call(null, entry)) {
    return coll.cljs$core$IAssociative$_assoc$arity$3(coll, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1))
  }else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll, entry)
  }
};
cljs.core.HashMap.prototype.toString = function() {
  var this__8692 = this;
  var this__8693 = this;
  return cljs.core.pr_str.call(null, this__8693)
};
cljs.core.HashMap.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__8694 = this;
  if(this__8694.count > 0) {
    var hashes__8695 = cljs.core.js_keys.call(null, this__8694.hashobj).sort();
    return cljs.core.mapcat.call(null, function(p1__8662_SHARP_) {
      return cljs.core.map.call(null, cljs.core.vec, cljs.core.partition.call(null, 2, this__8694.hashobj[p1__8662_SHARP_]))
    }, hashes__8695)
  }else {
    return null
  }
};
cljs.core.HashMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__8696 = this;
  return this__8696.count
};
cljs.core.HashMap.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__8697 = this;
  return cljs.core.equiv_map.call(null, coll, other)
};
cljs.core.HashMap.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__8698 = this;
  return new cljs.core.HashMap(meta, this__8698.count, this__8698.hashobj, this__8698.__hash)
};
cljs.core.HashMap.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__8699 = this;
  return this__8699.meta
};
cljs.core.HashMap.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__8700 = this;
  return cljs.core.with_meta.call(null, cljs.core.HashMap.EMPTY, this__8700.meta)
};
cljs.core.HashMap.prototype.cljs$core$IMap$_dissoc$arity$2 = function(coll, k) {
  var this__8701 = this;
  var h__8702 = cljs.core.hash.call(null, k);
  var bucket__8703 = this__8701.hashobj[h__8702];
  var i__8704 = cljs.core.truth_(bucket__8703) ? cljs.core.scan_array.call(null, 2, k, bucket__8703) : null;
  if(cljs.core.not.call(null, i__8704)) {
    return coll
  }else {
    var new_hashobj__8705 = goog.object.clone(this__8701.hashobj);
    if(3 > bucket__8703.length) {
      cljs.core.js_delete.call(null, new_hashobj__8705, h__8702)
    }else {
      var new_bucket__8706 = bucket__8703.slice();
      new_bucket__8706.splice(i__8704, 2);
      new_hashobj__8705[h__8702] = new_bucket__8706
    }
    return new cljs.core.HashMap(this__8701.meta, this__8701.count - 1, new_hashobj__8705, null)
  }
};
cljs.core.HashMap;
cljs.core.HashMap.EMPTY = new cljs.core.HashMap(null, 0, {}, 0);
cljs.core.HashMap.fromArrays = function(ks, vs) {
  var len__8708 = ks.length;
  var i__8709 = 0;
  var out__8710 = cljs.core.HashMap.EMPTY;
  while(true) {
    if(i__8709 < len__8708) {
      var G__8711 = i__8709 + 1;
      var G__8712 = cljs.core.assoc.call(null, out__8710, ks[i__8709], vs[i__8709]);
      i__8709 = G__8711;
      out__8710 = G__8712;
      continue
    }else {
      return out__8710
    }
    break
  }
};
cljs.core.array_map_index_of = function array_map_index_of(m, k) {
  var arr__8716 = m.arr;
  var len__8717 = arr__8716.length;
  var i__8718 = 0;
  while(true) {
    if(len__8717 <= i__8718) {
      return-1
    }else {
      if(cljs.core._EQ_.call(null, arr__8716[i__8718], k)) {
        return i__8718
      }else {
        if("\ufdd0'else") {
          var G__8719 = i__8718 + 2;
          i__8718 = G__8719;
          continue
        }else {
          return null
        }
      }
    }
    break
  }
};
cljs.core.PersistentArrayMap = function(meta, cnt, arr, __hash) {
  this.meta = meta;
  this.cnt = cnt;
  this.arr = arr;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 1;
  this.cljs$lang$protocol_mask$partition0$ = 16123663
};
cljs.core.PersistentArrayMap.cljs$lang$type = true;
cljs.core.PersistentArrayMap.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/PersistentArrayMap")
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IEditableCollection$_as_transient$arity$1 = function(coll) {
  var this__8722 = this;
  return new cljs.core.TransientArrayMap({}, this__8722.arr.length, this__8722.arr.slice())
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__8723 = this;
  var h__2192__auto____8724 = this__8723.__hash;
  if(!(h__2192__auto____8724 == null)) {
    return h__2192__auto____8724
  }else {
    var h__2192__auto____8725 = cljs.core.hash_imap.call(null, coll);
    this__8723.__hash = h__2192__auto____8725;
    return h__2192__auto____8725
  }
};
cljs.core.PersistentArrayMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__8726 = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(coll, k, null)
};
cljs.core.PersistentArrayMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__8727 = this;
  var idx__8728 = cljs.core.array_map_index_of.call(null, coll, k);
  if(idx__8728 === -1) {
    return not_found
  }else {
    return this__8727.arr[idx__8728 + 1]
  }
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__8729 = this;
  var idx__8730 = cljs.core.array_map_index_of.call(null, coll, k);
  if(idx__8730 === -1) {
    if(this__8729.cnt < cljs.core.PersistentArrayMap.HASHMAP_THRESHOLD) {
      return new cljs.core.PersistentArrayMap(this__8729.meta, this__8729.cnt + 1, function() {
        var G__8731__8732 = this__8729.arr.slice();
        G__8731__8732.push(k);
        G__8731__8732.push(v);
        return G__8731__8732
      }(), null)
    }else {
      return cljs.core.persistent_BANG_.call(null, cljs.core.assoc_BANG_.call(null, cljs.core.transient$.call(null, cljs.core.into.call(null, cljs.core.PersistentHashMap.EMPTY, coll)), k, v))
    }
  }else {
    if(v === this__8729.arr[idx__8730 + 1]) {
      return coll
    }else {
      if("\ufdd0'else") {
        return new cljs.core.PersistentArrayMap(this__8729.meta, this__8729.cnt, function() {
          var G__8733__8734 = this__8729.arr.slice();
          G__8733__8734[idx__8730 + 1] = v;
          return G__8733__8734
        }(), null)
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = function(coll, k) {
  var this__8735 = this;
  return!(cljs.core.array_map_index_of.call(null, coll, k) === -1)
};
cljs.core.PersistentArrayMap.prototype.call = function() {
  var G__8767 = null;
  var G__8767__2 = function(this_sym8736, k) {
    var this__8738 = this;
    var this_sym8736__8739 = this;
    var coll__8740 = this_sym8736__8739;
    return coll__8740.cljs$core$ILookup$_lookup$arity$2(coll__8740, k)
  };
  var G__8767__3 = function(this_sym8737, k, not_found) {
    var this__8738 = this;
    var this_sym8737__8741 = this;
    var coll__8742 = this_sym8737__8741;
    return coll__8742.cljs$core$ILookup$_lookup$arity$3(coll__8742, k, not_found)
  };
  G__8767 = function(this_sym8737, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__8767__2.call(this, this_sym8737, k);
      case 3:
        return G__8767__3.call(this, this_sym8737, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__8767
}();
cljs.core.PersistentArrayMap.prototype.apply = function(this_sym8720, args8721) {
  var this__8743 = this;
  return this_sym8720.call.apply(this_sym8720, [this_sym8720].concat(args8721.slice()))
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = function(coll, f, init) {
  var this__8744 = this;
  var len__8745 = this__8744.arr.length;
  var i__8746 = 0;
  var init__8747 = init;
  while(true) {
    if(i__8746 < len__8745) {
      var init__8748 = f.call(null, init__8747, this__8744.arr[i__8746], this__8744.arr[i__8746 + 1]);
      if(cljs.core.reduced_QMARK_.call(null, init__8748)) {
        return cljs.core.deref.call(null, init__8748)
      }else {
        var G__8768 = i__8746 + 2;
        var G__8769 = init__8748;
        i__8746 = G__8768;
        init__8747 = G__8769;
        continue
      }
    }else {
      return null
    }
    break
  }
};
cljs.core.PersistentArrayMap.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, entry) {
  var this__8749 = this;
  if(cljs.core.vector_QMARK_.call(null, entry)) {
    return coll.cljs$core$IAssociative$_assoc$arity$3(coll, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1))
  }else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll, entry)
  }
};
cljs.core.PersistentArrayMap.prototype.toString = function() {
  var this__8750 = this;
  var this__8751 = this;
  return cljs.core.pr_str.call(null, this__8751)
};
cljs.core.PersistentArrayMap.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__8752 = this;
  if(this__8752.cnt > 0) {
    var len__8753 = this__8752.arr.length;
    var array_map_seq__8754 = function array_map_seq(i) {
      return new cljs.core.LazySeq(null, false, function() {
        if(i < len__8753) {
          return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([this__8752.arr[i], this__8752.arr[i + 1]], true), array_map_seq.call(null, i + 2))
        }else {
          return null
        }
      }, null)
    };
    return array_map_seq__8754.call(null, 0)
  }else {
    return null
  }
};
cljs.core.PersistentArrayMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__8755 = this;
  return this__8755.cnt
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__8756 = this;
  return cljs.core.equiv_map.call(null, coll, other)
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__8757 = this;
  return new cljs.core.PersistentArrayMap(meta, this__8757.cnt, this__8757.arr, this__8757.__hash)
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__8758 = this;
  return this__8758.meta
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__8759 = this;
  return cljs.core._with_meta.call(null, cljs.core.PersistentArrayMap.EMPTY, this__8759.meta)
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IMap$_dissoc$arity$2 = function(coll, k) {
  var this__8760 = this;
  var idx__8761 = cljs.core.array_map_index_of.call(null, coll, k);
  if(idx__8761 >= 0) {
    var len__8762 = this__8760.arr.length;
    var new_len__8763 = len__8762 - 2;
    if(new_len__8763 === 0) {
      return coll.cljs$core$IEmptyableCollection$_empty$arity$1(coll)
    }else {
      var new_arr__8764 = cljs.core.make_array.call(null, new_len__8763);
      var s__8765 = 0;
      var d__8766 = 0;
      while(true) {
        if(s__8765 >= len__8762) {
          return new cljs.core.PersistentArrayMap(this__8760.meta, this__8760.cnt - 1, new_arr__8764, null)
        }else {
          if(cljs.core._EQ_.call(null, k, this__8760.arr[s__8765])) {
            var G__8770 = s__8765 + 2;
            var G__8771 = d__8766;
            s__8765 = G__8770;
            d__8766 = G__8771;
            continue
          }else {
            if("\ufdd0'else") {
              new_arr__8764[d__8766] = this__8760.arr[s__8765];
              new_arr__8764[d__8766 + 1] = this__8760.arr[s__8765 + 1];
              var G__8772 = s__8765 + 2;
              var G__8773 = d__8766 + 2;
              s__8765 = G__8772;
              d__8766 = G__8773;
              continue
            }else {
              return null
            }
          }
        }
        break
      }
    }
  }else {
    return coll
  }
};
cljs.core.PersistentArrayMap;
cljs.core.PersistentArrayMap.EMPTY = new cljs.core.PersistentArrayMap(null, 0, [], null);
cljs.core.PersistentArrayMap.HASHMAP_THRESHOLD = 16;
cljs.core.PersistentArrayMap.fromArrays = function(ks, vs) {
  var len__8774 = cljs.core.count.call(null, ks);
  var i__8775 = 0;
  var out__8776 = cljs.core.transient$.call(null, cljs.core.PersistentArrayMap.EMPTY);
  while(true) {
    if(i__8775 < len__8774) {
      var G__8777 = i__8775 + 1;
      var G__8778 = cljs.core.assoc_BANG_.call(null, out__8776, ks[i__8775], vs[i__8775]);
      i__8775 = G__8777;
      out__8776 = G__8778;
      continue
    }else {
      return cljs.core.persistent_BANG_.call(null, out__8776)
    }
    break
  }
};
cljs.core.TransientArrayMap = function(editable_QMARK_, len, arr) {
  this.editable_QMARK_ = editable_QMARK_;
  this.len = len;
  this.arr = arr;
  this.cljs$lang$protocol_mask$partition1$ = 14;
  this.cljs$lang$protocol_mask$partition0$ = 258
};
cljs.core.TransientArrayMap.cljs$lang$type = true;
cljs.core.TransientArrayMap.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/TransientArrayMap")
};
cljs.core.TransientArrayMap.prototype.cljs$core$ITransientMap$_dissoc_BANG_$arity$2 = function(tcoll, key) {
  var this__8779 = this;
  if(cljs.core.truth_(this__8779.editable_QMARK_)) {
    var idx__8780 = cljs.core.array_map_index_of.call(null, tcoll, key);
    if(idx__8780 >= 0) {
      this__8779.arr[idx__8780] = this__8779.arr[this__8779.len - 2];
      this__8779.arr[idx__8780 + 1] = this__8779.arr[this__8779.len - 1];
      var G__8781__8782 = this__8779.arr;
      G__8781__8782.pop();
      G__8781__8782.pop();
      G__8781__8782;
      this__8779.len = this__8779.len - 2
    }else {
    }
    return tcoll
  }else {
    throw new Error("dissoc! after persistent!");
  }
};
cljs.core.TransientArrayMap.prototype.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3 = function(tcoll, key, val) {
  var this__8783 = this;
  if(cljs.core.truth_(this__8783.editable_QMARK_)) {
    var idx__8784 = cljs.core.array_map_index_of.call(null, tcoll, key);
    if(idx__8784 === -1) {
      if(this__8783.len + 2 <= 2 * cljs.core.PersistentArrayMap.HASHMAP_THRESHOLD) {
        this__8783.len = this__8783.len + 2;
        this__8783.arr.push(key);
        this__8783.arr.push(val);
        return tcoll
      }else {
        return cljs.core.assoc_BANG_.call(null, cljs.core.array__GT_transient_hash_map.call(null, this__8783.len, this__8783.arr), key, val)
      }
    }else {
      if(val === this__8783.arr[idx__8784 + 1]) {
        return tcoll
      }else {
        this__8783.arr[idx__8784 + 1] = val;
        return tcoll
      }
    }
  }else {
    throw new Error("assoc! after persistent!");
  }
};
cljs.core.TransientArrayMap.prototype.cljs$core$ITransientCollection$_conj_BANG_$arity$2 = function(tcoll, o) {
  var this__8785 = this;
  if(cljs.core.truth_(this__8785.editable_QMARK_)) {
    if(function() {
      var G__8786__8787 = o;
      if(G__8786__8787) {
        if(function() {
          var or__3824__auto____8788 = G__8786__8787.cljs$lang$protocol_mask$partition0$ & 2048;
          if(or__3824__auto____8788) {
            return or__3824__auto____8788
          }else {
            return G__8786__8787.cljs$core$IMapEntry$
          }
        }()) {
          return true
        }else {
          if(!G__8786__8787.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.type_satisfies_.call(null, cljs.core.IMapEntry, G__8786__8787)
          }else {
            return false
          }
        }
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.IMapEntry, G__8786__8787)
      }
    }()) {
      return tcoll.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3(tcoll, cljs.core.key.call(null, o), cljs.core.val.call(null, o))
    }else {
      var es__8789 = cljs.core.seq.call(null, o);
      var tcoll__8790 = tcoll;
      while(true) {
        var temp__3971__auto____8791 = cljs.core.first.call(null, es__8789);
        if(cljs.core.truth_(temp__3971__auto____8791)) {
          var e__8792 = temp__3971__auto____8791;
          var G__8798 = cljs.core.next.call(null, es__8789);
          var G__8799 = tcoll__8790.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3(tcoll__8790, cljs.core.key.call(null, e__8792), cljs.core.val.call(null, e__8792));
          es__8789 = G__8798;
          tcoll__8790 = G__8799;
          continue
        }else {
          return tcoll__8790
        }
        break
      }
    }
  }else {
    throw new Error("conj! after persistent!");
  }
};
cljs.core.TransientArrayMap.prototype.cljs$core$ITransientCollection$_persistent_BANG_$arity$1 = function(tcoll) {
  var this__8793 = this;
  if(cljs.core.truth_(this__8793.editable_QMARK_)) {
    this__8793.editable_QMARK_ = false;
    return new cljs.core.PersistentArrayMap(null, cljs.core.quot.call(null, this__8793.len, 2), this__8793.arr, null)
  }else {
    throw new Error("persistent! called twice");
  }
};
cljs.core.TransientArrayMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(tcoll, k) {
  var this__8794 = this;
  return tcoll.cljs$core$ILookup$_lookup$arity$3(tcoll, k, null)
};
cljs.core.TransientArrayMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(tcoll, k, not_found) {
  var this__8795 = this;
  if(cljs.core.truth_(this__8795.editable_QMARK_)) {
    var idx__8796 = cljs.core.array_map_index_of.call(null, tcoll, k);
    if(idx__8796 === -1) {
      return not_found
    }else {
      return this__8795.arr[idx__8796 + 1]
    }
  }else {
    throw new Error("lookup after persistent!");
  }
};
cljs.core.TransientArrayMap.prototype.cljs$core$ICounted$_count$arity$1 = function(tcoll) {
  var this__8797 = this;
  if(cljs.core.truth_(this__8797.editable_QMARK_)) {
    return cljs.core.quot.call(null, this__8797.len, 2)
  }else {
    throw new Error("count after persistent!");
  }
};
cljs.core.TransientArrayMap;
cljs.core.array__GT_transient_hash_map = function array__GT_transient_hash_map(len, arr) {
  var out__8802 = cljs.core.transient$.call(null, cljs.core.ObjMap.EMPTY);
  var i__8803 = 0;
  while(true) {
    if(i__8803 < len) {
      var G__8804 = cljs.core.assoc_BANG_.call(null, out__8802, arr[i__8803], arr[i__8803 + 1]);
      var G__8805 = i__8803 + 2;
      out__8802 = G__8804;
      i__8803 = G__8805;
      continue
    }else {
      return out__8802
    }
    break
  }
};
cljs.core.Box = function(val) {
  this.val = val
};
cljs.core.Box.cljs$lang$type = true;
cljs.core.Box.cljs$lang$ctorPrSeq = function(this__2310__auto__) {
  return cljs.core.list.call(null, "cljs.core/Box")
};
cljs.core.Box;
cljs.core.key_test = function key_test(key, other) {
  if(goog.isString(key)) {
    return key === other
  }else {
    return cljs.core._EQ_.call(null, key, other)
  }
};
cljs.core.mask = function mask(hash, shift) {
  return hash >>> shift & 31
};
cljs.core.clone_and_set = function() {
  var clone_and_set = null;
  var clone_and_set__3 = function(arr, i, a) {
    var G__8810__8811 = arr.slice();
    G__8810__8811[i] = a;
    return G__8810__8811
  };
  var clone_and_set__5 = function(arr, i, a, j, b) {
    var G__8812__8813 = arr.slice();
    G__8812__8813[i] = a;
    G__8812__8813[j] = b;
    return G__8812__8813
  };
  clone_and_set = function(arr, i, a, j, b) {
    switch(arguments.length) {
      case 3:
        return clone_and_set__3.call(this, arr, i, a);
      case 5:
        return clone_and_set__5.call(this, arr, i, a, j, b)
    }
    throw"Invalid arity: " + arguments.length;
  };
  clone_and_set.cljs$lang$arity$3 = clone_and_set__3;
  clone_and_set.cljs$lang$arity$5 = clone_and_set__5;
  return clone_and_set
}();
cljs.core.remove_pair = function remove_pair(arr, i) {
  var new_arr__8815 = cljs.core.make_array.call(null, arr.length - 2);
  cljs.core.array_copy.call(null, arr, 0, new_arr__8815, 0, 2 * i);
  cljs.core.array_copy.call(null, arr, 2 * (i + 1), new_arr__8815, 2 * i, new_arr__8815.length - 2 * i);
  return new_arr__8815
};
cljs.core.bitmap_indexed_node_index = function bitmap_indexed_node_index(bitmap, bit) {
  return cljs.core.bit_count.call(null, bitmap & bit - 1)
};
cljs.core.bitpos = function bitpos(hash, shift) {
  return 1 << (hash >>> shift & 31)
};
cljs.core.edit_and_set = function() {
  var edit_and_set = null;
  var edit_and_set__4 = function(inode, edit, i, a) {
    var editable__8818 = inode.ensure_editable(edit);
    editable__8818.arr[i] = a;
    return editable__8818
  };
  var edit_and_set__6 = function(inode, edit, i, a, j, b) {
    var editable__8819 = inode.ensure_editable(edit);
    editable__8819.arr[i] = a;
    editable__8819.arr[j] = b;
    return editable__8819
  };
  edit_and_set = function(inode, edit, i, a, j, b) {
    switch(arguments.length) {
      case 4:
        return edit_and_set__4.call(this, inode, edit, i, a);
      case 6:
        return edit_and_set__6.call(this, inode, edit, i, a, j, b)
    }
    throw"Invalid arity: " + arguments.length;
  };
  edit_and_set.cljs$lang$arity$4 = edit_and_set__4;
  edit_and_set.cljs$lang$arity$6 = edit_and_set__6;
  return edit_and_set
}();
cljs.core.inode_kv_reduce = function inode_kv_reduce(arr, f, init) {
  var len__8826 = arr.length;
  var i__8827 = 0;
  var init__8828 = init;
  while(true) {
    if(i__8827 < len__8826) {
      var init__8831 = function() {
        var k__8829 = arr[i__8827];
        if(!(k__8829 == null)) {
          return f.call(null, init__8828, k__8829, arr[i__8827 + 1])
        }else {
          var node__8830 = arr[i__8827 + 1];
          if(!(node__8830 == null)) {
            return node__8830.kv_reduce(f, init__8828)
          }else {
            return init__8828
          }
        }
      }();
      if(cljs.core.reduced_QMARK_.call(null, init__8831)) {
        return cljs.core.deref.call(null, init__8831)
      }else {
        var G__8832 = i__8827 + 2;
        var G__8833 = init__8831;
        i__8827 = G__8832;
        init__8828 = G__8833;
        continue
      }
    }else {
      return init__8828
    }
    break
  }
};
cljs.core.BitmapIndexedNode = function(edit, bitmap, arr) {
  this.edit = edit;
  this.bitmap = bitmap;
  this.arr = arr
};
cljs.core.BitmapIndexedNode.cljs$lang$type = true;
cljs.core.BitmapIndexedNode.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/BitmapIndexedNode")
};
cljs.core.BitmapIndexedNode.prototype.edit_and_remove_pair = function(e, bit, i) {
  var this__8834 = this;
  var inode__8835 = this;
  if(this__8834.bitmap === bit) {
    return null
  }else {
    var editable__8836 = inode__8835.ensure_editable(e);
    var earr__8837 = editable__8836.arr;
    var len__8838 = earr__8837.length;
    editable__8836.bitmap = bit ^ editable__8836.bitmap;
    cljs.core.array_copy.call(null, earr__8837, 2 * (i + 1), earr__8837, 2 * i, len__8838 - 2 * (i + 1));
    earr__8837[len__8838 - 2] = null;
    earr__8837[len__8838 - 1] = null;
    return editable__8836
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_assoc_BANG_ = function(edit, shift, hash, key, val, added_leaf_QMARK_) {
  var this__8839 = this;
  var inode__8840 = this;
  var bit__8841 = 1 << (hash >>> shift & 31);
  var idx__8842 = cljs.core.bitmap_indexed_node_index.call(null, this__8839.bitmap, bit__8841);
  if((this__8839.bitmap & bit__8841) === 0) {
    var n__8843 = cljs.core.bit_count.call(null, this__8839.bitmap);
    if(2 * n__8843 < this__8839.arr.length) {
      var editable__8844 = inode__8840.ensure_editable(edit);
      var earr__8845 = editable__8844.arr;
      added_leaf_QMARK_.val = true;
      cljs.core.array_copy_downward.call(null, earr__8845, 2 * idx__8842, earr__8845, 2 * (idx__8842 + 1), 2 * (n__8843 - idx__8842));
      earr__8845[2 * idx__8842] = key;
      earr__8845[2 * idx__8842 + 1] = val;
      editable__8844.bitmap = editable__8844.bitmap | bit__8841;
      return editable__8844
    }else {
      if(n__8843 >= 16) {
        var nodes__8846 = cljs.core.make_array.call(null, 32);
        var jdx__8847 = hash >>> shift & 31;
        nodes__8846[jdx__8847] = cljs.core.BitmapIndexedNode.EMPTY.inode_assoc_BANG_(edit, shift + 5, hash, key, val, added_leaf_QMARK_);
        var i__8848 = 0;
        var j__8849 = 0;
        while(true) {
          if(i__8848 < 32) {
            if((this__8839.bitmap >>> i__8848 & 1) === 0) {
              var G__8902 = i__8848 + 1;
              var G__8903 = j__8849;
              i__8848 = G__8902;
              j__8849 = G__8903;
              continue
            }else {
              nodes__8846[i__8848] = !(this__8839.arr[j__8849] == null) ? cljs.core.BitmapIndexedNode.EMPTY.inode_assoc_BANG_(edit, shift + 5, cljs.core.hash.call(null, this__8839.arr[j__8849]), this__8839.arr[j__8849], this__8839.arr[j__8849 + 1], added_leaf_QMARK_) : this__8839.arr[j__8849 + 1];
              var G__8904 = i__8848 + 1;
              var G__8905 = j__8849 + 2;
              i__8848 = G__8904;
              j__8849 = G__8905;
              continue
            }
          }else {
          }
          break
        }
        return new cljs.core.ArrayNode(edit, n__8843 + 1, nodes__8846)
      }else {
        if("\ufdd0'else") {
          var new_arr__8850 = cljs.core.make_array.call(null, 2 * (n__8843 + 4));
          cljs.core.array_copy.call(null, this__8839.arr, 0, new_arr__8850, 0, 2 * idx__8842);
          new_arr__8850[2 * idx__8842] = key;
          new_arr__8850[2 * idx__8842 + 1] = val;
          cljs.core.array_copy.call(null, this__8839.arr, 2 * idx__8842, new_arr__8850, 2 * (idx__8842 + 1), 2 * (n__8843 - idx__8842));
          added_leaf_QMARK_.val = true;
          var editable__8851 = inode__8840.ensure_editable(edit);
          editable__8851.arr = new_arr__8850;
          editable__8851.bitmap = editable__8851.bitmap | bit__8841;
          return editable__8851
        }else {
          return null
        }
      }
    }
  }else {
    var key_or_nil__8852 = this__8839.arr[2 * idx__8842];
    var val_or_node__8853 = this__8839.arr[2 * idx__8842 + 1];
    if(key_or_nil__8852 == null) {
      var n__8854 = val_or_node__8853.inode_assoc_BANG_(edit, shift + 5, hash, key, val, added_leaf_QMARK_);
      if(n__8854 === val_or_node__8853) {
        return inode__8840
      }else {
        return cljs.core.edit_and_set.call(null, inode__8840, edit, 2 * idx__8842 + 1, n__8854)
      }
    }else {
      if(cljs.core.key_test.call(null, key, key_or_nil__8852)) {
        if(val === val_or_node__8853) {
          return inode__8840
        }else {
          return cljs.core.edit_and_set.call(null, inode__8840, edit, 2 * idx__8842 + 1, val)
        }
      }else {
        if("\ufdd0'else") {
          added_leaf_QMARK_.val = true;
          return cljs.core.edit_and_set.call(null, inode__8840, edit, 2 * idx__8842, null, 2 * idx__8842 + 1, cljs.core.create_node.call(null, edit, shift + 5, key_or_nil__8852, val_or_node__8853, hash, key, val))
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_seq = function() {
  var this__8855 = this;
  var inode__8856 = this;
  return cljs.core.create_inode_seq.call(null, this__8855.arr)
};
cljs.core.BitmapIndexedNode.prototype.inode_without_BANG_ = function(edit, shift, hash, key, removed_leaf_QMARK_) {
  var this__8857 = this;
  var inode__8858 = this;
  var bit__8859 = 1 << (hash >>> shift & 31);
  if((this__8857.bitmap & bit__8859) === 0) {
    return inode__8858
  }else {
    var idx__8860 = cljs.core.bitmap_indexed_node_index.call(null, this__8857.bitmap, bit__8859);
    var key_or_nil__8861 = this__8857.arr[2 * idx__8860];
    var val_or_node__8862 = this__8857.arr[2 * idx__8860 + 1];
    if(key_or_nil__8861 == null) {
      var n__8863 = val_or_node__8862.inode_without_BANG_(edit, shift + 5, hash, key, removed_leaf_QMARK_);
      if(n__8863 === val_or_node__8862) {
        return inode__8858
      }else {
        if(!(n__8863 == null)) {
          return cljs.core.edit_and_set.call(null, inode__8858, edit, 2 * idx__8860 + 1, n__8863)
        }else {
          if(this__8857.bitmap === bit__8859) {
            return null
          }else {
            if("\ufdd0'else") {
              return inode__8858.edit_and_remove_pair(edit, bit__8859, idx__8860)
            }else {
              return null
            }
          }
        }
      }
    }else {
      if(cljs.core.key_test.call(null, key, key_or_nil__8861)) {
        removed_leaf_QMARK_[0] = true;
        return inode__8858.edit_and_remove_pair(edit, bit__8859, idx__8860)
      }else {
        if("\ufdd0'else") {
          return inode__8858
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode.prototype.ensure_editable = function(e) {
  var this__8864 = this;
  var inode__8865 = this;
  if(e === this__8864.edit) {
    return inode__8865
  }else {
    var n__8866 = cljs.core.bit_count.call(null, this__8864.bitmap);
    var new_arr__8867 = cljs.core.make_array.call(null, n__8866 < 0 ? 4 : 2 * (n__8866 + 1));
    cljs.core.array_copy.call(null, this__8864.arr, 0, new_arr__8867, 0, 2 * n__8866);
    return new cljs.core.BitmapIndexedNode(e, this__8864.bitmap, new_arr__8867)
  }
};
cljs.core.BitmapIndexedNode.prototype.kv_reduce = function(f, init) {
  var this__8868 = this;
  var inode__8869 = this;
  return cljs.core.inode_kv_reduce.call(null, this__8868.arr, f, init)
};
cljs.core.BitmapIndexedNode.prototype.inode_find = function(shift, hash, key, not_found) {
  var this__8870 = this;
  var inode__8871 = this;
  var bit__8872 = 1 << (hash >>> shift & 31);
  if((this__8870.bitmap & bit__8872) === 0) {
    return not_found
  }else {
    var idx__8873 = cljs.core.bitmap_indexed_node_index.call(null, this__8870.bitmap, bit__8872);
    var key_or_nil__8874 = this__8870.arr[2 * idx__8873];
    var val_or_node__8875 = this__8870.arr[2 * idx__8873 + 1];
    if(key_or_nil__8874 == null) {
      return val_or_node__8875.inode_find(shift + 5, hash, key, not_found)
    }else {
      if(cljs.core.key_test.call(null, key, key_or_nil__8874)) {
        return cljs.core.PersistentVector.fromArray([key_or_nil__8874, val_or_node__8875], true)
      }else {
        if("\ufdd0'else") {
          return not_found
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_without = function(shift, hash, key) {
  var this__8876 = this;
  var inode__8877 = this;
  var bit__8878 = 1 << (hash >>> shift & 31);
  if((this__8876.bitmap & bit__8878) === 0) {
    return inode__8877
  }else {
    var idx__8879 = cljs.core.bitmap_indexed_node_index.call(null, this__8876.bitmap, bit__8878);
    var key_or_nil__8880 = this__8876.arr[2 * idx__8879];
    var val_or_node__8881 = this__8876.arr[2 * idx__8879 + 1];
    if(key_or_nil__8880 == null) {
      var n__8882 = val_or_node__8881.inode_without(shift + 5, hash, key);
      if(n__8882 === val_or_node__8881) {
        return inode__8877
      }else {
        if(!(n__8882 == null)) {
          return new cljs.core.BitmapIndexedNode(null, this__8876.bitmap, cljs.core.clone_and_set.call(null, this__8876.arr, 2 * idx__8879 + 1, n__8882))
        }else {
          if(this__8876.bitmap === bit__8878) {
            return null
          }else {
            if("\ufdd0'else") {
              return new cljs.core.BitmapIndexedNode(null, this__8876.bitmap ^ bit__8878, cljs.core.remove_pair.call(null, this__8876.arr, idx__8879))
            }else {
              return null
            }
          }
        }
      }
    }else {
      if(cljs.core.key_test.call(null, key, key_or_nil__8880)) {
        return new cljs.core.BitmapIndexedNode(null, this__8876.bitmap ^ bit__8878, cljs.core.remove_pair.call(null, this__8876.arr, idx__8879))
      }else {
        if("\ufdd0'else") {
          return inode__8877
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_assoc = function(shift, hash, key, val, added_leaf_QMARK_) {
  var this__8883 = this;
  var inode__8884 = this;
  var bit__8885 = 1 << (hash >>> shift & 31);
  var idx__8886 = cljs.core.bitmap_indexed_node_index.call(null, this__8883.bitmap, bit__8885);
  if((this__8883.bitmap & bit__8885) === 0) {
    var n__8887 = cljs.core.bit_count.call(null, this__8883.bitmap);
    if(n__8887 >= 16) {
      var nodes__8888 = cljs.core.make_array.call(null, 32);
      var jdx__8889 = hash >>> shift & 31;
      nodes__8888[jdx__8889] = cljs.core.BitmapIndexedNode.EMPTY.inode_assoc(shift + 5, hash, key, val, added_leaf_QMARK_);
      var i__8890 = 0;
      var j__8891 = 0;
      while(true) {
        if(i__8890 < 32) {
          if((this__8883.bitmap >>> i__8890 & 1) === 0) {
            var G__8906 = i__8890 + 1;
            var G__8907 = j__8891;
            i__8890 = G__8906;
            j__8891 = G__8907;
            continue
          }else {
            nodes__8888[i__8890] = !(this__8883.arr[j__8891] == null) ? cljs.core.BitmapIndexedNode.EMPTY.inode_assoc(shift + 5, cljs.core.hash.call(null, this__8883.arr[j__8891]), this__8883.arr[j__8891], this__8883.arr[j__8891 + 1], added_leaf_QMARK_) : this__8883.arr[j__8891 + 1];
            var G__8908 = i__8890 + 1;
            var G__8909 = j__8891 + 2;
            i__8890 = G__8908;
            j__8891 = G__8909;
            continue
          }
        }else {
        }
        break
      }
      return new cljs.core.ArrayNode(null, n__8887 + 1, nodes__8888)
    }else {
      var new_arr__8892 = cljs.core.make_array.call(null, 2 * (n__8887 + 1));
      cljs.core.array_copy.call(null, this__8883.arr, 0, new_arr__8892, 0, 2 * idx__8886);
      new_arr__8892[2 * idx__8886] = key;
      new_arr__8892[2 * idx__8886 + 1] = val;
      cljs.core.array_copy.call(null, this__8883.arr, 2 * idx__8886, new_arr__8892, 2 * (idx__8886 + 1), 2 * (n__8887 - idx__8886));
      added_leaf_QMARK_.val = true;
      return new cljs.core.BitmapIndexedNode(null, this__8883.bitmap | bit__8885, new_arr__8892)
    }
  }else {
    var key_or_nil__8893 = this__8883.arr[2 * idx__8886];
    var val_or_node__8894 = this__8883.arr[2 * idx__8886 + 1];
    if(key_or_nil__8893 == null) {
      var n__8895 = val_or_node__8894.inode_assoc(shift + 5, hash, key, val, added_leaf_QMARK_);
      if(n__8895 === val_or_node__8894) {
        return inode__8884
      }else {
        return new cljs.core.BitmapIndexedNode(null, this__8883.bitmap, cljs.core.clone_and_set.call(null, this__8883.arr, 2 * idx__8886 + 1, n__8895))
      }
    }else {
      if(cljs.core.key_test.call(null, key, key_or_nil__8893)) {
        if(val === val_or_node__8894) {
          return inode__8884
        }else {
          return new cljs.core.BitmapIndexedNode(null, this__8883.bitmap, cljs.core.clone_and_set.call(null, this__8883.arr, 2 * idx__8886 + 1, val))
        }
      }else {
        if("\ufdd0'else") {
          added_leaf_QMARK_.val = true;
          return new cljs.core.BitmapIndexedNode(null, this__8883.bitmap, cljs.core.clone_and_set.call(null, this__8883.arr, 2 * idx__8886, null, 2 * idx__8886 + 1, cljs.core.create_node.call(null, shift + 5, key_or_nil__8893, val_or_node__8894, hash, key, val)))
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_lookup = function(shift, hash, key, not_found) {
  var this__8896 = this;
  var inode__8897 = this;
  var bit__8898 = 1 << (hash >>> shift & 31);
  if((this__8896.bitmap & bit__8898) === 0) {
    return not_found
  }else {
    var idx__8899 = cljs.core.bitmap_indexed_node_index.call(null, this__8896.bitmap, bit__8898);
    var key_or_nil__8900 = this__8896.arr[2 * idx__8899];
    var val_or_node__8901 = this__8896.arr[2 * idx__8899 + 1];
    if(key_or_nil__8900 == null) {
      return val_or_node__8901.inode_lookup(shift + 5, hash, key, not_found)
    }else {
      if(cljs.core.key_test.call(null, key, key_or_nil__8900)) {
        return val_or_node__8901
      }else {
        if("\ufdd0'else") {
          return not_found
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode;
cljs.core.BitmapIndexedNode.EMPTY = new cljs.core.BitmapIndexedNode(null, 0, cljs.core.make_array.call(null, 0));
cljs.core.pack_array_node = function pack_array_node(array_node, edit, idx) {
  var arr__8917 = array_node.arr;
  var len__8918 = 2 * (array_node.cnt - 1);
  var new_arr__8919 = cljs.core.make_array.call(null, len__8918);
  var i__8920 = 0;
  var j__8921 = 1;
  var bitmap__8922 = 0;
  while(true) {
    if(i__8920 < len__8918) {
      if(function() {
        var and__3822__auto____8923 = !(i__8920 === idx);
        if(and__3822__auto____8923) {
          return!(arr__8917[i__8920] == null)
        }else {
          return and__3822__auto____8923
        }
      }()) {
        new_arr__8919[j__8921] = arr__8917[i__8920];
        var G__8924 = i__8920 + 1;
        var G__8925 = j__8921 + 2;
        var G__8926 = bitmap__8922 | 1 << i__8920;
        i__8920 = G__8924;
        j__8921 = G__8925;
        bitmap__8922 = G__8926;
        continue
      }else {
        var G__8927 = i__8920 + 1;
        var G__8928 = j__8921;
        var G__8929 = bitmap__8922;
        i__8920 = G__8927;
        j__8921 = G__8928;
        bitmap__8922 = G__8929;
        continue
      }
    }else {
      return new cljs.core.BitmapIndexedNode(edit, bitmap__8922, new_arr__8919)
    }
    break
  }
};
cljs.core.ArrayNode = function(edit, cnt, arr) {
  this.edit = edit;
  this.cnt = cnt;
  this.arr = arr
};
cljs.core.ArrayNode.cljs$lang$type = true;
cljs.core.ArrayNode.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/ArrayNode")
};
cljs.core.ArrayNode.prototype.inode_assoc_BANG_ = function(edit, shift, hash, key, val, added_leaf_QMARK_) {
  var this__8930 = this;
  var inode__8931 = this;
  var idx__8932 = hash >>> shift & 31;
  var node__8933 = this__8930.arr[idx__8932];
  if(node__8933 == null) {
    var editable__8934 = cljs.core.edit_and_set.call(null, inode__8931, edit, idx__8932, cljs.core.BitmapIndexedNode.EMPTY.inode_assoc_BANG_(edit, shift + 5, hash, key, val, added_leaf_QMARK_));
    editable__8934.cnt = editable__8934.cnt + 1;
    return editable__8934
  }else {
    var n__8935 = node__8933.inode_assoc_BANG_(edit, shift + 5, hash, key, val, added_leaf_QMARK_);
    if(n__8935 === node__8933) {
      return inode__8931
    }else {
      return cljs.core.edit_and_set.call(null, inode__8931, edit, idx__8932, n__8935)
    }
  }
};
cljs.core.ArrayNode.prototype.inode_seq = function() {
  var this__8936 = this;
  var inode__8937 = this;
  return cljs.core.create_array_node_seq.call(null, this__8936.arr)
};
cljs.core.ArrayNode.prototype.inode_without_BANG_ = function(edit, shift, hash, key, removed_leaf_QMARK_) {
  var this__8938 = this;
  var inode__8939 = this;
  var idx__8940 = hash >>> shift & 31;
  var node__8941 = this__8938.arr[idx__8940];
  if(node__8941 == null) {
    return inode__8939
  }else {
    var n__8942 = node__8941.inode_without_BANG_(edit, shift + 5, hash, key, removed_leaf_QMARK_);
    if(n__8942 === node__8941) {
      return inode__8939
    }else {
      if(n__8942 == null) {
        if(this__8938.cnt <= 8) {
          return cljs.core.pack_array_node.call(null, inode__8939, edit, idx__8940)
        }else {
          var editable__8943 = cljs.core.edit_and_set.call(null, inode__8939, edit, idx__8940, n__8942);
          editable__8943.cnt = editable__8943.cnt - 1;
          return editable__8943
        }
      }else {
        if("\ufdd0'else") {
          return cljs.core.edit_and_set.call(null, inode__8939, edit, idx__8940, n__8942)
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.ArrayNode.prototype.ensure_editable = function(e) {
  var this__8944 = this;
  var inode__8945 = this;
  if(e === this__8944.edit) {
    return inode__8945
  }else {
    return new cljs.core.ArrayNode(e, this__8944.cnt, this__8944.arr.slice())
  }
};
cljs.core.ArrayNode.prototype.kv_reduce = function(f, init) {
  var this__8946 = this;
  var inode__8947 = this;
  var len__8948 = this__8946.arr.length;
  var i__8949 = 0;
  var init__8950 = init;
  while(true) {
    if(i__8949 < len__8948) {
      var node__8951 = this__8946.arr[i__8949];
      if(!(node__8951 == null)) {
        var init__8952 = node__8951.kv_reduce(f, init__8950);
        if(cljs.core.reduced_QMARK_.call(null, init__8952)) {
          return cljs.core.deref.call(null, init__8952)
        }else {
          var G__8971 = i__8949 + 1;
          var G__8972 = init__8952;
          i__8949 = G__8971;
          init__8950 = G__8972;
          continue
        }
      }else {
        return null
      }
    }else {
      return init__8950
    }
    break
  }
};
cljs.core.ArrayNode.prototype.inode_find = function(shift, hash, key, not_found) {
  var this__8953 = this;
  var inode__8954 = this;
  var idx__8955 = hash >>> shift & 31;
  var node__8956 = this__8953.arr[idx__8955];
  if(!(node__8956 == null)) {
    return node__8956.inode_find(shift + 5, hash, key, not_found)
  }else {
    return not_found
  }
};
cljs.core.ArrayNode.prototype.inode_without = function(shift, hash, key) {
  var this__8957 = this;
  var inode__8958 = this;
  var idx__8959 = hash >>> shift & 31;
  var node__8960 = this__8957.arr[idx__8959];
  if(!(node__8960 == null)) {
    var n__8961 = node__8960.inode_without(shift + 5, hash, key);
    if(n__8961 === node__8960) {
      return inode__8958
    }else {
      if(n__8961 == null) {
        if(this__8957.cnt <= 8) {
          return cljs.core.pack_array_node.call(null, inode__8958, null, idx__8959)
        }else {
          return new cljs.core.ArrayNode(null, this__8957.cnt - 1, cljs.core.clone_and_set.call(null, this__8957.arr, idx__8959, n__8961))
        }
      }else {
        if("\ufdd0'else") {
          return new cljs.core.ArrayNode(null, this__8957.cnt, cljs.core.clone_and_set.call(null, this__8957.arr, idx__8959, n__8961))
        }else {
          return null
        }
      }
    }
  }else {
    return inode__8958
  }
};
cljs.core.ArrayNode.prototype.inode_assoc = function(shift, hash, key, val, added_leaf_QMARK_) {
  var this__8962 = this;
  var inode__8963 = this;
  var idx__8964 = hash >>> shift & 31;
  var node__8965 = this__8962.arr[idx__8964];
  if(node__8965 == null) {
    return new cljs.core.ArrayNode(null, this__8962.cnt + 1, cljs.core.clone_and_set.call(null, this__8962.arr, idx__8964, cljs.core.BitmapIndexedNode.EMPTY.inode_assoc(shift + 5, hash, key, val, added_leaf_QMARK_)))
  }else {
    var n__8966 = node__8965.inode_assoc(shift + 5, hash, key, val, added_leaf_QMARK_);
    if(n__8966 === node__8965) {
      return inode__8963
    }else {
      return new cljs.core.ArrayNode(null, this__8962.cnt, cljs.core.clone_and_set.call(null, this__8962.arr, idx__8964, n__8966))
    }
  }
};
cljs.core.ArrayNode.prototype.inode_lookup = function(shift, hash, key, not_found) {
  var this__8967 = this;
  var inode__8968 = this;
  var idx__8969 = hash >>> shift & 31;
  var node__8970 = this__8967.arr[idx__8969];
  if(!(node__8970 == null)) {
    return node__8970.inode_lookup(shift + 5, hash, key, not_found)
  }else {
    return not_found
  }
};
cljs.core.ArrayNode;
cljs.core.hash_collision_node_find_index = function hash_collision_node_find_index(arr, cnt, key) {
  var lim__8975 = 2 * cnt;
  var i__8976 = 0;
  while(true) {
    if(i__8976 < lim__8975) {
      if(cljs.core.key_test.call(null, key, arr[i__8976])) {
        return i__8976
      }else {
        var G__8977 = i__8976 + 2;
        i__8976 = G__8977;
        continue
      }
    }else {
      return-1
    }
    break
  }
};
cljs.core.HashCollisionNode = function(edit, collision_hash, cnt, arr) {
  this.edit = edit;
  this.collision_hash = collision_hash;
  this.cnt = cnt;
  this.arr = arr
};
cljs.core.HashCollisionNode.cljs$lang$type = true;
cljs.core.HashCollisionNode.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/HashCollisionNode")
};
cljs.core.HashCollisionNode.prototype.inode_assoc_BANG_ = function(edit, shift, hash, key, val, added_leaf_QMARK_) {
  var this__8978 = this;
  var inode__8979 = this;
  if(hash === this__8978.collision_hash) {
    var idx__8980 = cljs.core.hash_collision_node_find_index.call(null, this__8978.arr, this__8978.cnt, key);
    if(idx__8980 === -1) {
      if(this__8978.arr.length > 2 * this__8978.cnt) {
        var editable__8981 = cljs.core.edit_and_set.call(null, inode__8979, edit, 2 * this__8978.cnt, key, 2 * this__8978.cnt + 1, val);
        added_leaf_QMARK_.val = true;
        editable__8981.cnt = editable__8981.cnt + 1;
        return editable__8981
      }else {
        var len__8982 = this__8978.arr.length;
        var new_arr__8983 = cljs.core.make_array.call(null, len__8982 + 2);
        cljs.core.array_copy.call(null, this__8978.arr, 0, new_arr__8983, 0, len__8982);
        new_arr__8983[len__8982] = key;
        new_arr__8983[len__8982 + 1] = val;
        added_leaf_QMARK_.val = true;
        return inode__8979.ensure_editable_array(edit, this__8978.cnt + 1, new_arr__8983)
      }
    }else {
      if(this__8978.arr[idx__8980 + 1] === val) {
        return inode__8979
      }else {
        return cljs.core.edit_and_set.call(null, inode__8979, edit, idx__8980 + 1, val)
      }
    }
  }else {
    return(new cljs.core.BitmapIndexedNode(edit, 1 << (this__8978.collision_hash >>> shift & 31), [null, inode__8979, null, null])).inode_assoc_BANG_(edit, shift, hash, key, val, added_leaf_QMARK_)
  }
};
cljs.core.HashCollisionNode.prototype.inode_seq = function() {
  var this__8984 = this;
  var inode__8985 = this;
  return cljs.core.create_inode_seq.call(null, this__8984.arr)
};
cljs.core.HashCollisionNode.prototype.inode_without_BANG_ = function(edit, shift, hash, key, removed_leaf_QMARK_) {
  var this__8986 = this;
  var inode__8987 = this;
  var idx__8988 = cljs.core.hash_collision_node_find_index.call(null, this__8986.arr, this__8986.cnt, key);
  if(idx__8988 === -1) {
    return inode__8987
  }else {
    removed_leaf_QMARK_[0] = true;
    if(this__8986.cnt === 1) {
      return null
    }else {
      var editable__8989 = inode__8987.ensure_editable(edit);
      var earr__8990 = editable__8989.arr;
      earr__8990[idx__8988] = earr__8990[2 * this__8986.cnt - 2];
      earr__8990[idx__8988 + 1] = earr__8990[2 * this__8986.cnt - 1];
      earr__8990[2 * this__8986.cnt - 1] = null;
      earr__8990[2 * this__8986.cnt - 2] = null;
      editable__8989.cnt = editable__8989.cnt - 1;
      return editable__8989
    }
  }
};
cljs.core.HashCollisionNode.prototype.ensure_editable = function(e) {
  var this__8991 = this;
  var inode__8992 = this;
  if(e === this__8991.edit) {
    return inode__8992
  }else {
    var new_arr__8993 = cljs.core.make_array.call(null, 2 * (this__8991.cnt + 1));
    cljs.core.array_copy.call(null, this__8991.arr, 0, new_arr__8993, 0, 2 * this__8991.cnt);
    return new cljs.core.HashCollisionNode(e, this__8991.collision_hash, this__8991.cnt, new_arr__8993)
  }
};
cljs.core.HashCollisionNode.prototype.kv_reduce = function(f, init) {
  var this__8994 = this;
  var inode__8995 = this;
  return cljs.core.inode_kv_reduce.call(null, this__8994.arr, f, init)
};
cljs.core.HashCollisionNode.prototype.inode_find = function(shift, hash, key, not_found) {
  var this__8996 = this;
  var inode__8997 = this;
  var idx__8998 = cljs.core.hash_collision_node_find_index.call(null, this__8996.arr, this__8996.cnt, key);
  if(idx__8998 < 0) {
    return not_found
  }else {
    if(cljs.core.key_test.call(null, key, this__8996.arr[idx__8998])) {
      return cljs.core.PersistentVector.fromArray([this__8996.arr[idx__8998], this__8996.arr[idx__8998 + 1]], true)
    }else {
      if("\ufdd0'else") {
        return not_found
      }else {
        return null
      }
    }
  }
};
cljs.core.HashCollisionNode.prototype.inode_without = function(shift, hash, key) {
  var this__8999 = this;
  var inode__9000 = this;
  var idx__9001 = cljs.core.hash_collision_node_find_index.call(null, this__8999.arr, this__8999.cnt, key);
  if(idx__9001 === -1) {
    return inode__9000
  }else {
    if(this__8999.cnt === 1) {
      return null
    }else {
      if("\ufdd0'else") {
        return new cljs.core.HashCollisionNode(null, this__8999.collision_hash, this__8999.cnt - 1, cljs.core.remove_pair.call(null, this__8999.arr, cljs.core.quot.call(null, idx__9001, 2)))
      }else {
        return null
      }
    }
  }
};
cljs.core.HashCollisionNode.prototype.inode_assoc = function(shift, hash, key, val, added_leaf_QMARK_) {
  var this__9002 = this;
  var inode__9003 = this;
  if(hash === this__9002.collision_hash) {
    var idx__9004 = cljs.core.hash_collision_node_find_index.call(null, this__9002.arr, this__9002.cnt, key);
    if(idx__9004 === -1) {
      var len__9005 = this__9002.arr.length;
      var new_arr__9006 = cljs.core.make_array.call(null, len__9005 + 2);
      cljs.core.array_copy.call(null, this__9002.arr, 0, new_arr__9006, 0, len__9005);
      new_arr__9006[len__9005] = key;
      new_arr__9006[len__9005 + 1] = val;
      added_leaf_QMARK_.val = true;
      return new cljs.core.HashCollisionNode(null, this__9002.collision_hash, this__9002.cnt + 1, new_arr__9006)
    }else {
      if(cljs.core._EQ_.call(null, this__9002.arr[idx__9004], val)) {
        return inode__9003
      }else {
        return new cljs.core.HashCollisionNode(null, this__9002.collision_hash, this__9002.cnt, cljs.core.clone_and_set.call(null, this__9002.arr, idx__9004 + 1, val))
      }
    }
  }else {
    return(new cljs.core.BitmapIndexedNode(null, 1 << (this__9002.collision_hash >>> shift & 31), [null, inode__9003])).inode_assoc(shift, hash, key, val, added_leaf_QMARK_)
  }
};
cljs.core.HashCollisionNode.prototype.inode_lookup = function(shift, hash, key, not_found) {
  var this__9007 = this;
  var inode__9008 = this;
  var idx__9009 = cljs.core.hash_collision_node_find_index.call(null, this__9007.arr, this__9007.cnt, key);
  if(idx__9009 < 0) {
    return not_found
  }else {
    if(cljs.core.key_test.call(null, key, this__9007.arr[idx__9009])) {
      return this__9007.arr[idx__9009 + 1]
    }else {
      if("\ufdd0'else") {
        return not_found
      }else {
        return null
      }
    }
  }
};
cljs.core.HashCollisionNode.prototype.ensure_editable_array = function(e, count, array) {
  var this__9010 = this;
  var inode__9011 = this;
  if(e === this__9010.edit) {
    this__9010.arr = array;
    this__9010.cnt = count;
    return inode__9011
  }else {
    return new cljs.core.HashCollisionNode(this__9010.edit, this__9010.collision_hash, count, array)
  }
};
cljs.core.HashCollisionNode;
cljs.core.create_node = function() {
  var create_node = null;
  var create_node__6 = function(shift, key1, val1, key2hash, key2, val2) {
    var key1hash__9016 = cljs.core.hash.call(null, key1);
    if(key1hash__9016 === key2hash) {
      return new cljs.core.HashCollisionNode(null, key1hash__9016, 2, [key1, val1, key2, val2])
    }else {
      var added_leaf_QMARK___9017 = new cljs.core.Box(false);
      return cljs.core.BitmapIndexedNode.EMPTY.inode_assoc(shift, key1hash__9016, key1, val1, added_leaf_QMARK___9017).inode_assoc(shift, key2hash, key2, val2, added_leaf_QMARK___9017)
    }
  };
  var create_node__7 = function(edit, shift, key1, val1, key2hash, key2, val2) {
    var key1hash__9018 = cljs.core.hash.call(null, key1);
    if(key1hash__9018 === key2hash) {
      return new cljs.core.HashCollisionNode(null, key1hash__9018, 2, [key1, val1, key2, val2])
    }else {
      var added_leaf_QMARK___9019 = new cljs.core.Box(false);
      return cljs.core.BitmapIndexedNode.EMPTY.inode_assoc_BANG_(edit, shift, key1hash__9018, key1, val1, added_leaf_QMARK___9019).inode_assoc_BANG_(edit, shift, key2hash, key2, val2, added_leaf_QMARK___9019)
    }
  };
  create_node = function(edit, shift, key1, val1, key2hash, key2, val2) {
    switch(arguments.length) {
      case 6:
        return create_node__6.call(this, edit, shift, key1, val1, key2hash, key2);
      case 7:
        return create_node__7.call(this, edit, shift, key1, val1, key2hash, key2, val2)
    }
    throw"Invalid arity: " + arguments.length;
  };
  create_node.cljs$lang$arity$6 = create_node__6;
  create_node.cljs$lang$arity$7 = create_node__7;
  return create_node
}();
cljs.core.NodeSeq = function(meta, nodes, i, s, __hash) {
  this.meta = meta;
  this.nodes = nodes;
  this.i = i;
  this.s = s;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 31850572
};
cljs.core.NodeSeq.cljs$lang$type = true;
cljs.core.NodeSeq.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/NodeSeq")
};
cljs.core.NodeSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9020 = this;
  var h__2192__auto____9021 = this__9020.__hash;
  if(!(h__2192__auto____9021 == null)) {
    return h__2192__auto____9021
  }else {
    var h__2192__auto____9022 = cljs.core.hash_coll.call(null, coll);
    this__9020.__hash = h__2192__auto____9022;
    return h__2192__auto____9022
  }
};
cljs.core.NodeSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__9023 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.NodeSeq.prototype.toString = function() {
  var this__9024 = this;
  var this__9025 = this;
  return cljs.core.pr_str.call(null, this__9025)
};
cljs.core.NodeSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(this$) {
  var this__9026 = this;
  return this$
};
cljs.core.NodeSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__9027 = this;
  if(this__9027.s == null) {
    return cljs.core.PersistentVector.fromArray([this__9027.nodes[this__9027.i], this__9027.nodes[this__9027.i + 1]], true)
  }else {
    return cljs.core.first.call(null, this__9027.s)
  }
};
cljs.core.NodeSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__9028 = this;
  if(this__9028.s == null) {
    return cljs.core.create_inode_seq.call(null, this__9028.nodes, this__9028.i + 2, null)
  }else {
    return cljs.core.create_inode_seq.call(null, this__9028.nodes, this__9028.i, cljs.core.next.call(null, this__9028.s))
  }
};
cljs.core.NodeSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9029 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.NodeSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9030 = this;
  return new cljs.core.NodeSeq(meta, this__9030.nodes, this__9030.i, this__9030.s, this__9030.__hash)
};
cljs.core.NodeSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9031 = this;
  return this__9031.meta
};
cljs.core.NodeSeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__9032 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__9032.meta)
};
cljs.core.NodeSeq;
cljs.core.create_inode_seq = function() {
  var create_inode_seq = null;
  var create_inode_seq__1 = function(nodes) {
    return create_inode_seq.call(null, nodes, 0, null)
  };
  var create_inode_seq__3 = function(nodes, i, s) {
    if(s == null) {
      var len__9039 = nodes.length;
      var j__9040 = i;
      while(true) {
        if(j__9040 < len__9039) {
          if(!(nodes[j__9040] == null)) {
            return new cljs.core.NodeSeq(null, nodes, j__9040, null, null)
          }else {
            var temp__3971__auto____9041 = nodes[j__9040 + 1];
            if(cljs.core.truth_(temp__3971__auto____9041)) {
              var node__9042 = temp__3971__auto____9041;
              var temp__3971__auto____9043 = node__9042.inode_seq();
              if(cljs.core.truth_(temp__3971__auto____9043)) {
                var node_seq__9044 = temp__3971__auto____9043;
                return new cljs.core.NodeSeq(null, nodes, j__9040 + 2, node_seq__9044, null)
              }else {
                var G__9045 = j__9040 + 2;
                j__9040 = G__9045;
                continue
              }
            }else {
              var G__9046 = j__9040 + 2;
              j__9040 = G__9046;
              continue
            }
          }
        }else {
          return null
        }
        break
      }
    }else {
      return new cljs.core.NodeSeq(null, nodes, i, s, null)
    }
  };
  create_inode_seq = function(nodes, i, s) {
    switch(arguments.length) {
      case 1:
        return create_inode_seq__1.call(this, nodes);
      case 3:
        return create_inode_seq__3.call(this, nodes, i, s)
    }
    throw"Invalid arity: " + arguments.length;
  };
  create_inode_seq.cljs$lang$arity$1 = create_inode_seq__1;
  create_inode_seq.cljs$lang$arity$3 = create_inode_seq__3;
  return create_inode_seq
}();
cljs.core.ArrayNodeSeq = function(meta, nodes, i, s, __hash) {
  this.meta = meta;
  this.nodes = nodes;
  this.i = i;
  this.s = s;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 31850572
};
cljs.core.ArrayNodeSeq.cljs$lang$type = true;
cljs.core.ArrayNodeSeq.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/ArrayNodeSeq")
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9047 = this;
  var h__2192__auto____9048 = this__9047.__hash;
  if(!(h__2192__auto____9048 == null)) {
    return h__2192__auto____9048
  }else {
    var h__2192__auto____9049 = cljs.core.hash_coll.call(null, coll);
    this__9047.__hash = h__2192__auto____9049;
    return h__2192__auto____9049
  }
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__9050 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.ArrayNodeSeq.prototype.toString = function() {
  var this__9051 = this;
  var this__9052 = this;
  return cljs.core.pr_str.call(null, this__9052)
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(this$) {
  var this__9053 = this;
  return this$
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__9054 = this;
  return cljs.core.first.call(null, this__9054.s)
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__9055 = this;
  return cljs.core.create_array_node_seq.call(null, null, this__9055.nodes, this__9055.i, cljs.core.next.call(null, this__9055.s))
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9056 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9057 = this;
  return new cljs.core.ArrayNodeSeq(meta, this__9057.nodes, this__9057.i, this__9057.s, this__9057.__hash)
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9058 = this;
  return this__9058.meta
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__9059 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__9059.meta)
};
cljs.core.ArrayNodeSeq;
cljs.core.create_array_node_seq = function() {
  var create_array_node_seq = null;
  var create_array_node_seq__1 = function(nodes) {
    return create_array_node_seq.call(null, null, nodes, 0, null)
  };
  var create_array_node_seq__4 = function(meta, nodes, i, s) {
    if(s == null) {
      var len__9066 = nodes.length;
      var j__9067 = i;
      while(true) {
        if(j__9067 < len__9066) {
          var temp__3971__auto____9068 = nodes[j__9067];
          if(cljs.core.truth_(temp__3971__auto____9068)) {
            var nj__9069 = temp__3971__auto____9068;
            var temp__3971__auto____9070 = nj__9069.inode_seq();
            if(cljs.core.truth_(temp__3971__auto____9070)) {
              var ns__9071 = temp__3971__auto____9070;
              return new cljs.core.ArrayNodeSeq(meta, nodes, j__9067 + 1, ns__9071, null)
            }else {
              var G__9072 = j__9067 + 1;
              j__9067 = G__9072;
              continue
            }
          }else {
            var G__9073 = j__9067 + 1;
            j__9067 = G__9073;
            continue
          }
        }else {
          return null
        }
        break
      }
    }else {
      return new cljs.core.ArrayNodeSeq(meta, nodes, i, s, null)
    }
  };
  create_array_node_seq = function(meta, nodes, i, s) {
    switch(arguments.length) {
      case 1:
        return create_array_node_seq__1.call(this, meta);
      case 4:
        return create_array_node_seq__4.call(this, meta, nodes, i, s)
    }
    throw"Invalid arity: " + arguments.length;
  };
  create_array_node_seq.cljs$lang$arity$1 = create_array_node_seq__1;
  create_array_node_seq.cljs$lang$arity$4 = create_array_node_seq__4;
  return create_array_node_seq
}();
cljs.core.PersistentHashMap = function(meta, cnt, root, has_nil_QMARK_, nil_val, __hash) {
  this.meta = meta;
  this.cnt = cnt;
  this.root = root;
  this.has_nil_QMARK_ = has_nil_QMARK_;
  this.nil_val = nil_val;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 1;
  this.cljs$lang$protocol_mask$partition0$ = 16123663
};
cljs.core.PersistentHashMap.cljs$lang$type = true;
cljs.core.PersistentHashMap.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/PersistentHashMap")
};
cljs.core.PersistentHashMap.prototype.cljs$core$IEditableCollection$_as_transient$arity$1 = function(coll) {
  var this__9076 = this;
  return new cljs.core.TransientHashMap({}, this__9076.root, this__9076.cnt, this__9076.has_nil_QMARK_, this__9076.nil_val)
};
cljs.core.PersistentHashMap.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9077 = this;
  var h__2192__auto____9078 = this__9077.__hash;
  if(!(h__2192__auto____9078 == null)) {
    return h__2192__auto____9078
  }else {
    var h__2192__auto____9079 = cljs.core.hash_imap.call(null, coll);
    this__9077.__hash = h__2192__auto____9079;
    return h__2192__auto____9079
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__9080 = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(coll, k, null)
};
cljs.core.PersistentHashMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__9081 = this;
  if(k == null) {
    if(this__9081.has_nil_QMARK_) {
      return this__9081.nil_val
    }else {
      return not_found
    }
  }else {
    if(this__9081.root == null) {
      return not_found
    }else {
      if("\ufdd0'else") {
        return this__9081.root.inode_lookup(0, cljs.core.hash.call(null, k), k, not_found)
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__9082 = this;
  if(k == null) {
    if(function() {
      var and__3822__auto____9083 = this__9082.has_nil_QMARK_;
      if(and__3822__auto____9083) {
        return v === this__9082.nil_val
      }else {
        return and__3822__auto____9083
      }
    }()) {
      return coll
    }else {
      return new cljs.core.PersistentHashMap(this__9082.meta, this__9082.has_nil_QMARK_ ? this__9082.cnt : this__9082.cnt + 1, this__9082.root, true, v, null)
    }
  }else {
    var added_leaf_QMARK___9084 = new cljs.core.Box(false);
    var new_root__9085 = (this__9082.root == null ? cljs.core.BitmapIndexedNode.EMPTY : this__9082.root).inode_assoc(0, cljs.core.hash.call(null, k), k, v, added_leaf_QMARK___9084);
    if(new_root__9085 === this__9082.root) {
      return coll
    }else {
      return new cljs.core.PersistentHashMap(this__9082.meta, added_leaf_QMARK___9084.val ? this__9082.cnt + 1 : this__9082.cnt, new_root__9085, this__9082.has_nil_QMARK_, this__9082.nil_val, null)
    }
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = function(coll, k) {
  var this__9086 = this;
  if(k == null) {
    return this__9086.has_nil_QMARK_
  }else {
    if(this__9086.root == null) {
      return false
    }else {
      if("\ufdd0'else") {
        return!(this__9086.root.inode_lookup(0, cljs.core.hash.call(null, k), k, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel)
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentHashMap.prototype.call = function() {
  var G__9109 = null;
  var G__9109__2 = function(this_sym9087, k) {
    var this__9089 = this;
    var this_sym9087__9090 = this;
    var coll__9091 = this_sym9087__9090;
    return coll__9091.cljs$core$ILookup$_lookup$arity$2(coll__9091, k)
  };
  var G__9109__3 = function(this_sym9088, k, not_found) {
    var this__9089 = this;
    var this_sym9088__9092 = this;
    var coll__9093 = this_sym9088__9092;
    return coll__9093.cljs$core$ILookup$_lookup$arity$3(coll__9093, k, not_found)
  };
  G__9109 = function(this_sym9088, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__9109__2.call(this, this_sym9088, k);
      case 3:
        return G__9109__3.call(this, this_sym9088, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9109
}();
cljs.core.PersistentHashMap.prototype.apply = function(this_sym9074, args9075) {
  var this__9094 = this;
  return this_sym9074.call.apply(this_sym9074, [this_sym9074].concat(args9075.slice()))
};
cljs.core.PersistentHashMap.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = function(coll, f, init) {
  var this__9095 = this;
  var init__9096 = this__9095.has_nil_QMARK_ ? f.call(null, init, null, this__9095.nil_val) : init;
  if(cljs.core.reduced_QMARK_.call(null, init__9096)) {
    return cljs.core.deref.call(null, init__9096)
  }else {
    if(!(this__9095.root == null)) {
      return this__9095.root.kv_reduce(f, init__9096)
    }else {
      if("\ufdd0'else") {
        return init__9096
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, entry) {
  var this__9097 = this;
  if(cljs.core.vector_QMARK_.call(null, entry)) {
    return coll.cljs$core$IAssociative$_assoc$arity$3(coll, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1))
  }else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll, entry)
  }
};
cljs.core.PersistentHashMap.prototype.toString = function() {
  var this__9098 = this;
  var this__9099 = this;
  return cljs.core.pr_str.call(null, this__9099)
};
cljs.core.PersistentHashMap.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__9100 = this;
  if(this__9100.cnt > 0) {
    var s__9101 = !(this__9100.root == null) ? this__9100.root.inode_seq() : null;
    if(this__9100.has_nil_QMARK_) {
      return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([null, this__9100.nil_val], true), s__9101)
    }else {
      return s__9101
    }
  }else {
    return null
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__9102 = this;
  return this__9102.cnt
};
cljs.core.PersistentHashMap.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9103 = this;
  return cljs.core.equiv_map.call(null, coll, other)
};
cljs.core.PersistentHashMap.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9104 = this;
  return new cljs.core.PersistentHashMap(meta, this__9104.cnt, this__9104.root, this__9104.has_nil_QMARK_, this__9104.nil_val, this__9104.__hash)
};
cljs.core.PersistentHashMap.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9105 = this;
  return this__9105.meta
};
cljs.core.PersistentHashMap.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__9106 = this;
  return cljs.core._with_meta.call(null, cljs.core.PersistentHashMap.EMPTY, this__9106.meta)
};
cljs.core.PersistentHashMap.prototype.cljs$core$IMap$_dissoc$arity$2 = function(coll, k) {
  var this__9107 = this;
  if(k == null) {
    if(this__9107.has_nil_QMARK_) {
      return new cljs.core.PersistentHashMap(this__9107.meta, this__9107.cnt - 1, this__9107.root, false, null, null)
    }else {
      return coll
    }
  }else {
    if(this__9107.root == null) {
      return coll
    }else {
      if("\ufdd0'else") {
        var new_root__9108 = this__9107.root.inode_without(0, cljs.core.hash.call(null, k), k);
        if(new_root__9108 === this__9107.root) {
          return coll
        }else {
          return new cljs.core.PersistentHashMap(this__9107.meta, this__9107.cnt - 1, new_root__9108, this__9107.has_nil_QMARK_, this__9107.nil_val, null)
        }
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentHashMap;
cljs.core.PersistentHashMap.EMPTY = new cljs.core.PersistentHashMap(null, 0, null, false, null, 0);
cljs.core.PersistentHashMap.fromArrays = function(ks, vs) {
  var len__9110 = ks.length;
  var i__9111 = 0;
  var out__9112 = cljs.core.transient$.call(null, cljs.core.PersistentHashMap.EMPTY);
  while(true) {
    if(i__9111 < len__9110) {
      var G__9113 = i__9111 + 1;
      var G__9114 = cljs.core.assoc_BANG_.call(null, out__9112, ks[i__9111], vs[i__9111]);
      i__9111 = G__9113;
      out__9112 = G__9114;
      continue
    }else {
      return cljs.core.persistent_BANG_.call(null, out__9112)
    }
    break
  }
};
cljs.core.TransientHashMap = function(edit, root, count, has_nil_QMARK_, nil_val) {
  this.edit = edit;
  this.root = root;
  this.count = count;
  this.has_nil_QMARK_ = has_nil_QMARK_;
  this.nil_val = nil_val;
  this.cljs$lang$protocol_mask$partition1$ = 14;
  this.cljs$lang$protocol_mask$partition0$ = 258
};
cljs.core.TransientHashMap.cljs$lang$type = true;
cljs.core.TransientHashMap.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/TransientHashMap")
};
cljs.core.TransientHashMap.prototype.cljs$core$ITransientMap$_dissoc_BANG_$arity$2 = function(tcoll, key) {
  var this__9115 = this;
  return tcoll.without_BANG_(key)
};
cljs.core.TransientHashMap.prototype.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3 = function(tcoll, key, val) {
  var this__9116 = this;
  return tcoll.assoc_BANG_(key, val)
};
cljs.core.TransientHashMap.prototype.cljs$core$ITransientCollection$_conj_BANG_$arity$2 = function(tcoll, val) {
  var this__9117 = this;
  return tcoll.conj_BANG_(val)
};
cljs.core.TransientHashMap.prototype.cljs$core$ITransientCollection$_persistent_BANG_$arity$1 = function(tcoll) {
  var this__9118 = this;
  return tcoll.persistent_BANG_()
};
cljs.core.TransientHashMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(tcoll, k) {
  var this__9119 = this;
  if(k == null) {
    if(this__9119.has_nil_QMARK_) {
      return this__9119.nil_val
    }else {
      return null
    }
  }else {
    if(this__9119.root == null) {
      return null
    }else {
      return this__9119.root.inode_lookup(0, cljs.core.hash.call(null, k), k)
    }
  }
};
cljs.core.TransientHashMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(tcoll, k, not_found) {
  var this__9120 = this;
  if(k == null) {
    if(this__9120.has_nil_QMARK_) {
      return this__9120.nil_val
    }else {
      return not_found
    }
  }else {
    if(this__9120.root == null) {
      return not_found
    }else {
      return this__9120.root.inode_lookup(0, cljs.core.hash.call(null, k), k, not_found)
    }
  }
};
cljs.core.TransientHashMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__9121 = this;
  if(this__9121.edit) {
    return this__9121.count
  }else {
    throw new Error("count after persistent!");
  }
};
cljs.core.TransientHashMap.prototype.conj_BANG_ = function(o) {
  var this__9122 = this;
  var tcoll__9123 = this;
  if(this__9122.edit) {
    if(function() {
      var G__9124__9125 = o;
      if(G__9124__9125) {
        if(function() {
          var or__3824__auto____9126 = G__9124__9125.cljs$lang$protocol_mask$partition0$ & 2048;
          if(or__3824__auto____9126) {
            return or__3824__auto____9126
          }else {
            return G__9124__9125.cljs$core$IMapEntry$
          }
        }()) {
          return true
        }else {
          if(!G__9124__9125.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.type_satisfies_.call(null, cljs.core.IMapEntry, G__9124__9125)
          }else {
            return false
          }
        }
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.IMapEntry, G__9124__9125)
      }
    }()) {
      return tcoll__9123.assoc_BANG_(cljs.core.key.call(null, o), cljs.core.val.call(null, o))
    }else {
      var es__9127 = cljs.core.seq.call(null, o);
      var tcoll__9128 = tcoll__9123;
      while(true) {
        var temp__3971__auto____9129 = cljs.core.first.call(null, es__9127);
        if(cljs.core.truth_(temp__3971__auto____9129)) {
          var e__9130 = temp__3971__auto____9129;
          var G__9141 = cljs.core.next.call(null, es__9127);
          var G__9142 = tcoll__9128.assoc_BANG_(cljs.core.key.call(null, e__9130), cljs.core.val.call(null, e__9130));
          es__9127 = G__9141;
          tcoll__9128 = G__9142;
          continue
        }else {
          return tcoll__9128
        }
        break
      }
    }
  }else {
    throw new Error("conj! after persistent");
  }
};
cljs.core.TransientHashMap.prototype.assoc_BANG_ = function(k, v) {
  var this__9131 = this;
  var tcoll__9132 = this;
  if(this__9131.edit) {
    if(k == null) {
      if(this__9131.nil_val === v) {
      }else {
        this__9131.nil_val = v
      }
      if(this__9131.has_nil_QMARK_) {
      }else {
        this__9131.count = this__9131.count + 1;
        this__9131.has_nil_QMARK_ = true
      }
      return tcoll__9132
    }else {
      var added_leaf_QMARK___9133 = new cljs.core.Box(false);
      var node__9134 = (this__9131.root == null ? cljs.core.BitmapIndexedNode.EMPTY : this__9131.root).inode_assoc_BANG_(this__9131.edit, 0, cljs.core.hash.call(null, k), k, v, added_leaf_QMARK___9133);
      if(node__9134 === this__9131.root) {
      }else {
        this__9131.root = node__9134
      }
      if(added_leaf_QMARK___9133.val) {
        this__9131.count = this__9131.count + 1
      }else {
      }
      return tcoll__9132
    }
  }else {
    throw new Error("assoc! after persistent!");
  }
};
cljs.core.TransientHashMap.prototype.without_BANG_ = function(k) {
  var this__9135 = this;
  var tcoll__9136 = this;
  if(this__9135.edit) {
    if(k == null) {
      if(this__9135.has_nil_QMARK_) {
        this__9135.has_nil_QMARK_ = false;
        this__9135.nil_val = null;
        this__9135.count = this__9135.count - 1;
        return tcoll__9136
      }else {
        return tcoll__9136
      }
    }else {
      if(this__9135.root == null) {
        return tcoll__9136
      }else {
        var removed_leaf_QMARK___9137 = new cljs.core.Box(false);
        var node__9138 = this__9135.root.inode_without_BANG_(this__9135.edit, 0, cljs.core.hash.call(null, k), k, removed_leaf_QMARK___9137);
        if(node__9138 === this__9135.root) {
        }else {
          this__9135.root = node__9138
        }
        if(cljs.core.truth_(removed_leaf_QMARK___9137[0])) {
          this__9135.count = this__9135.count - 1
        }else {
        }
        return tcoll__9136
      }
    }
  }else {
    throw new Error("dissoc! after persistent!");
  }
};
cljs.core.TransientHashMap.prototype.persistent_BANG_ = function() {
  var this__9139 = this;
  var tcoll__9140 = this;
  if(this__9139.edit) {
    this__9139.edit = null;
    return new cljs.core.PersistentHashMap(null, this__9139.count, this__9139.root, this__9139.has_nil_QMARK_, this__9139.nil_val, null)
  }else {
    throw new Error("persistent! called twice");
  }
};
cljs.core.TransientHashMap;
cljs.core.tree_map_seq_push = function tree_map_seq_push(node, stack, ascending_QMARK_) {
  var t__9145 = node;
  var stack__9146 = stack;
  while(true) {
    if(!(t__9145 == null)) {
      var G__9147 = ascending_QMARK_ ? t__9145.left : t__9145.right;
      var G__9148 = cljs.core.conj.call(null, stack__9146, t__9145);
      t__9145 = G__9147;
      stack__9146 = G__9148;
      continue
    }else {
      return stack__9146
    }
    break
  }
};
cljs.core.PersistentTreeMapSeq = function(meta, stack, ascending_QMARK_, cnt, __hash) {
  this.meta = meta;
  this.stack = stack;
  this.ascending_QMARK_ = ascending_QMARK_;
  this.cnt = cnt;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 31850570
};
cljs.core.PersistentTreeMapSeq.cljs$lang$type = true;
cljs.core.PersistentTreeMapSeq.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/PersistentTreeMapSeq")
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9149 = this;
  var h__2192__auto____9150 = this__9149.__hash;
  if(!(h__2192__auto____9150 == null)) {
    return h__2192__auto____9150
  }else {
    var h__2192__auto____9151 = cljs.core.hash_coll.call(null, coll);
    this__9149.__hash = h__2192__auto____9151;
    return h__2192__auto____9151
  }
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__9152 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.PersistentTreeMapSeq.prototype.toString = function() {
  var this__9153 = this;
  var this__9154 = this;
  return cljs.core.pr_str.call(null, this__9154)
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(this$) {
  var this__9155 = this;
  return this$
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__9156 = this;
  if(this__9156.cnt < 0) {
    return cljs.core.count.call(null, cljs.core.next.call(null, coll)) + 1
  }else {
    return this__9156.cnt
  }
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(this$) {
  var this__9157 = this;
  return cljs.core.peek.call(null, this__9157.stack)
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(this$) {
  var this__9158 = this;
  var t__9159 = cljs.core.first.call(null, this__9158.stack);
  var next_stack__9160 = cljs.core.tree_map_seq_push.call(null, this__9158.ascending_QMARK_ ? t__9159.right : t__9159.left, cljs.core.next.call(null, this__9158.stack), this__9158.ascending_QMARK_);
  if(!(next_stack__9160 == null)) {
    return new cljs.core.PersistentTreeMapSeq(null, next_stack__9160, this__9158.ascending_QMARK_, this__9158.cnt - 1, null)
  }else {
    return cljs.core.List.EMPTY
  }
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9161 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9162 = this;
  return new cljs.core.PersistentTreeMapSeq(meta, this__9162.stack, this__9162.ascending_QMARK_, this__9162.cnt, this__9162.__hash)
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9163 = this;
  return this__9163.meta
};
cljs.core.PersistentTreeMapSeq;
cljs.core.create_tree_map_seq = function create_tree_map_seq(tree, ascending_QMARK_, cnt) {
  return new cljs.core.PersistentTreeMapSeq(null, cljs.core.tree_map_seq_push.call(null, tree, null, ascending_QMARK_), ascending_QMARK_, cnt, null)
};
cljs.core.balance_left = function balance_left(key, val, ins, right) {
  if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, ins)) {
    if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, ins.left)) {
      return new cljs.core.RedNode(ins.key, ins.val, ins.left.blacken(), new cljs.core.BlackNode(key, val, ins.right, right, null), null)
    }else {
      if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, ins.right)) {
        return new cljs.core.RedNode(ins.right.key, ins.right.val, new cljs.core.BlackNode(ins.key, ins.val, ins.left, ins.right.left, null), new cljs.core.BlackNode(key, val, ins.right.right, right, null), null)
      }else {
        if("\ufdd0'else") {
          return new cljs.core.BlackNode(key, val, ins, right, null)
        }else {
          return null
        }
      }
    }
  }else {
    return new cljs.core.BlackNode(key, val, ins, right, null)
  }
};
cljs.core.balance_right = function balance_right(key, val, left, ins) {
  if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, ins)) {
    if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, ins.right)) {
      return new cljs.core.RedNode(ins.key, ins.val, new cljs.core.BlackNode(key, val, left, ins.left, null), ins.right.blacken(), null)
    }else {
      if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, ins.left)) {
        return new cljs.core.RedNode(ins.left.key, ins.left.val, new cljs.core.BlackNode(key, val, left, ins.left.left, null), new cljs.core.BlackNode(ins.key, ins.val, ins.left.right, ins.right, null), null)
      }else {
        if("\ufdd0'else") {
          return new cljs.core.BlackNode(key, val, left, ins, null)
        }else {
          return null
        }
      }
    }
  }else {
    return new cljs.core.BlackNode(key, val, left, ins, null)
  }
};
cljs.core.balance_left_del = function balance_left_del(key, val, del, right) {
  if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, del)) {
    return new cljs.core.RedNode(key, val, del.blacken(), right, null)
  }else {
    if(cljs.core.instance_QMARK_.call(null, cljs.core.BlackNode, right)) {
      return cljs.core.balance_right.call(null, key, val, del, right.redden())
    }else {
      if(function() {
        var and__3822__auto____9165 = cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, right);
        if(and__3822__auto____9165) {
          return cljs.core.instance_QMARK_.call(null, cljs.core.BlackNode, right.left)
        }else {
          return and__3822__auto____9165
        }
      }()) {
        return new cljs.core.RedNode(right.left.key, right.left.val, new cljs.core.BlackNode(key, val, del, right.left.left, null), cljs.core.balance_right.call(null, right.key, right.val, right.left.right, right.right.redden()), null)
      }else {
        if("\ufdd0'else") {
          throw new Error("red-black tree invariant violation");
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.balance_right_del = function balance_right_del(key, val, left, del) {
  if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, del)) {
    return new cljs.core.RedNode(key, val, left, del.blacken(), null)
  }else {
    if(cljs.core.instance_QMARK_.call(null, cljs.core.BlackNode, left)) {
      return cljs.core.balance_left.call(null, key, val, left.redden(), del)
    }else {
      if(function() {
        var and__3822__auto____9167 = cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, left);
        if(and__3822__auto____9167) {
          return cljs.core.instance_QMARK_.call(null, cljs.core.BlackNode, left.right)
        }else {
          return and__3822__auto____9167
        }
      }()) {
        return new cljs.core.RedNode(left.right.key, left.right.val, cljs.core.balance_left.call(null, left.key, left.val, left.left.redden(), left.right.left), new cljs.core.BlackNode(key, val, left.right.right, del, null), null)
      }else {
        if("\ufdd0'else") {
          throw new Error("red-black tree invariant violation");
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.tree_map_kv_reduce = function tree_map_kv_reduce(node, f, init) {
  var init__9171 = f.call(null, init, node.key, node.val);
  if(cljs.core.reduced_QMARK_.call(null, init__9171)) {
    return cljs.core.deref.call(null, init__9171)
  }else {
    var init__9172 = !(node.left == null) ? tree_map_kv_reduce.call(null, node.left, f, init__9171) : init__9171;
    if(cljs.core.reduced_QMARK_.call(null, init__9172)) {
      return cljs.core.deref.call(null, init__9172)
    }else {
      var init__9173 = !(node.right == null) ? tree_map_kv_reduce.call(null, node.right, f, init__9172) : init__9172;
      if(cljs.core.reduced_QMARK_.call(null, init__9173)) {
        return cljs.core.deref.call(null, init__9173)
      }else {
        return init__9173
      }
    }
  }
};
cljs.core.BlackNode = function(key, val, left, right, __hash) {
  this.key = key;
  this.val = val;
  this.left = left;
  this.right = right;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32402207
};
cljs.core.BlackNode.cljs$lang$type = true;
cljs.core.BlackNode.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/BlackNode")
};
cljs.core.BlackNode.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9176 = this;
  var h__2192__auto____9177 = this__9176.__hash;
  if(!(h__2192__auto____9177 == null)) {
    return h__2192__auto____9177
  }else {
    var h__2192__auto____9178 = cljs.core.hash_coll.call(null, coll);
    this__9176.__hash = h__2192__auto____9178;
    return h__2192__auto____9178
  }
};
cljs.core.BlackNode.prototype.cljs$core$ILookup$_lookup$arity$2 = function(node, k) {
  var this__9179 = this;
  return node.cljs$core$IIndexed$_nth$arity$3(node, k, null)
};
cljs.core.BlackNode.prototype.cljs$core$ILookup$_lookup$arity$3 = function(node, k, not_found) {
  var this__9180 = this;
  return node.cljs$core$IIndexed$_nth$arity$3(node, k, not_found)
};
cljs.core.BlackNode.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(node, k, v) {
  var this__9181 = this;
  return cljs.core.assoc.call(null, cljs.core.PersistentVector.fromArray([this__9181.key, this__9181.val], true), k, v)
};
cljs.core.BlackNode.prototype.call = function() {
  var G__9229 = null;
  var G__9229__2 = function(this_sym9182, k) {
    var this__9184 = this;
    var this_sym9182__9185 = this;
    var node__9186 = this_sym9182__9185;
    return node__9186.cljs$core$ILookup$_lookup$arity$2(node__9186, k)
  };
  var G__9229__3 = function(this_sym9183, k, not_found) {
    var this__9184 = this;
    var this_sym9183__9187 = this;
    var node__9188 = this_sym9183__9187;
    return node__9188.cljs$core$ILookup$_lookup$arity$3(node__9188, k, not_found)
  };
  G__9229 = function(this_sym9183, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__9229__2.call(this, this_sym9183, k);
      case 3:
        return G__9229__3.call(this, this_sym9183, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9229
}();
cljs.core.BlackNode.prototype.apply = function(this_sym9174, args9175) {
  var this__9189 = this;
  return this_sym9174.call.apply(this_sym9174, [this_sym9174].concat(args9175.slice()))
};
cljs.core.BlackNode.prototype.cljs$core$ICollection$_conj$arity$2 = function(node, o) {
  var this__9190 = this;
  return cljs.core.PersistentVector.fromArray([this__9190.key, this__9190.val, o], true)
};
cljs.core.BlackNode.prototype.cljs$core$IMapEntry$_key$arity$1 = function(node) {
  var this__9191 = this;
  return this__9191.key
};
cljs.core.BlackNode.prototype.cljs$core$IMapEntry$_val$arity$1 = function(node) {
  var this__9192 = this;
  return this__9192.val
};
cljs.core.BlackNode.prototype.add_right = function(ins) {
  var this__9193 = this;
  var node__9194 = this;
  return ins.balance_right(node__9194)
};
cljs.core.BlackNode.prototype.redden = function() {
  var this__9195 = this;
  var node__9196 = this;
  return new cljs.core.RedNode(this__9195.key, this__9195.val, this__9195.left, this__9195.right, null)
};
cljs.core.BlackNode.prototype.remove_right = function(del) {
  var this__9197 = this;
  var node__9198 = this;
  return cljs.core.balance_right_del.call(null, this__9197.key, this__9197.val, this__9197.left, del)
};
cljs.core.BlackNode.prototype.replace = function(key, val, left, right) {
  var this__9199 = this;
  var node__9200 = this;
  return new cljs.core.BlackNode(key, val, left, right, null)
};
cljs.core.BlackNode.prototype.kv_reduce = function(f, init) {
  var this__9201 = this;
  var node__9202 = this;
  return cljs.core.tree_map_kv_reduce.call(null, node__9202, f, init)
};
cljs.core.BlackNode.prototype.remove_left = function(del) {
  var this__9203 = this;
  var node__9204 = this;
  return cljs.core.balance_left_del.call(null, this__9203.key, this__9203.val, del, this__9203.right)
};
cljs.core.BlackNode.prototype.add_left = function(ins) {
  var this__9205 = this;
  var node__9206 = this;
  return ins.balance_left(node__9206)
};
cljs.core.BlackNode.prototype.balance_left = function(parent) {
  var this__9207 = this;
  var node__9208 = this;
  return new cljs.core.BlackNode(parent.key, parent.val, node__9208, parent.right, null)
};
cljs.core.BlackNode.prototype.toString = function() {
  var G__9230 = null;
  var G__9230__0 = function() {
    var this__9209 = this;
    var this__9211 = this;
    return cljs.core.pr_str.call(null, this__9211)
  };
  G__9230 = function() {
    switch(arguments.length) {
      case 0:
        return G__9230__0.call(this)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9230
}();
cljs.core.BlackNode.prototype.balance_right = function(parent) {
  var this__9212 = this;
  var node__9213 = this;
  return new cljs.core.BlackNode(parent.key, parent.val, parent.left, node__9213, null)
};
cljs.core.BlackNode.prototype.blacken = function() {
  var this__9214 = this;
  var node__9215 = this;
  return node__9215
};
cljs.core.BlackNode.prototype.cljs$core$IReduce$_reduce$arity$2 = function(node, f) {
  var this__9216 = this;
  return cljs.core.ci_reduce.call(null, node, f)
};
cljs.core.BlackNode.prototype.cljs$core$IReduce$_reduce$arity$3 = function(node, f, start) {
  var this__9217 = this;
  return cljs.core.ci_reduce.call(null, node, f, start)
};
cljs.core.BlackNode.prototype.cljs$core$ISeqable$_seq$arity$1 = function(node) {
  var this__9218 = this;
  return cljs.core.list.call(null, this__9218.key, this__9218.val)
};
cljs.core.BlackNode.prototype.cljs$core$ICounted$_count$arity$1 = function(node) {
  var this__9219 = this;
  return 2
};
cljs.core.BlackNode.prototype.cljs$core$IStack$_peek$arity$1 = function(node) {
  var this__9220 = this;
  return this__9220.val
};
cljs.core.BlackNode.prototype.cljs$core$IStack$_pop$arity$1 = function(node) {
  var this__9221 = this;
  return cljs.core.PersistentVector.fromArray([this__9221.key], true)
};
cljs.core.BlackNode.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(node, n, v) {
  var this__9222 = this;
  return cljs.core._assoc_n.call(null, cljs.core.PersistentVector.fromArray([this__9222.key, this__9222.val], true), n, v)
};
cljs.core.BlackNode.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9223 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.BlackNode.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(node, meta) {
  var this__9224 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentVector.fromArray([this__9224.key, this__9224.val], true), meta)
};
cljs.core.BlackNode.prototype.cljs$core$IMeta$_meta$arity$1 = function(node) {
  var this__9225 = this;
  return null
};
cljs.core.BlackNode.prototype.cljs$core$IIndexed$_nth$arity$2 = function(node, n) {
  var this__9226 = this;
  if(n === 0) {
    return this__9226.key
  }else {
    if(n === 1) {
      return this__9226.val
    }else {
      if("\ufdd0'else") {
        return null
      }else {
        return null
      }
    }
  }
};
cljs.core.BlackNode.prototype.cljs$core$IIndexed$_nth$arity$3 = function(node, n, not_found) {
  var this__9227 = this;
  if(n === 0) {
    return this__9227.key
  }else {
    if(n === 1) {
      return this__9227.val
    }else {
      if("\ufdd0'else") {
        return not_found
      }else {
        return null
      }
    }
  }
};
cljs.core.BlackNode.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(node) {
  var this__9228 = this;
  return cljs.core.PersistentVector.EMPTY
};
cljs.core.BlackNode;
cljs.core.RedNode = function(key, val, left, right, __hash) {
  this.key = key;
  this.val = val;
  this.left = left;
  this.right = right;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32402207
};
cljs.core.RedNode.cljs$lang$type = true;
cljs.core.RedNode.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/RedNode")
};
cljs.core.RedNode.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9233 = this;
  var h__2192__auto____9234 = this__9233.__hash;
  if(!(h__2192__auto____9234 == null)) {
    return h__2192__auto____9234
  }else {
    var h__2192__auto____9235 = cljs.core.hash_coll.call(null, coll);
    this__9233.__hash = h__2192__auto____9235;
    return h__2192__auto____9235
  }
};
cljs.core.RedNode.prototype.cljs$core$ILookup$_lookup$arity$2 = function(node, k) {
  var this__9236 = this;
  return node.cljs$core$IIndexed$_nth$arity$3(node, k, null)
};
cljs.core.RedNode.prototype.cljs$core$ILookup$_lookup$arity$3 = function(node, k, not_found) {
  var this__9237 = this;
  return node.cljs$core$IIndexed$_nth$arity$3(node, k, not_found)
};
cljs.core.RedNode.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(node, k, v) {
  var this__9238 = this;
  return cljs.core.assoc.call(null, cljs.core.PersistentVector.fromArray([this__9238.key, this__9238.val], true), k, v)
};
cljs.core.RedNode.prototype.call = function() {
  var G__9286 = null;
  var G__9286__2 = function(this_sym9239, k) {
    var this__9241 = this;
    var this_sym9239__9242 = this;
    var node__9243 = this_sym9239__9242;
    return node__9243.cljs$core$ILookup$_lookup$arity$2(node__9243, k)
  };
  var G__9286__3 = function(this_sym9240, k, not_found) {
    var this__9241 = this;
    var this_sym9240__9244 = this;
    var node__9245 = this_sym9240__9244;
    return node__9245.cljs$core$ILookup$_lookup$arity$3(node__9245, k, not_found)
  };
  G__9286 = function(this_sym9240, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__9286__2.call(this, this_sym9240, k);
      case 3:
        return G__9286__3.call(this, this_sym9240, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9286
}();
cljs.core.RedNode.prototype.apply = function(this_sym9231, args9232) {
  var this__9246 = this;
  return this_sym9231.call.apply(this_sym9231, [this_sym9231].concat(args9232.slice()))
};
cljs.core.RedNode.prototype.cljs$core$ICollection$_conj$arity$2 = function(node, o) {
  var this__9247 = this;
  return cljs.core.PersistentVector.fromArray([this__9247.key, this__9247.val, o], true)
};
cljs.core.RedNode.prototype.cljs$core$IMapEntry$_key$arity$1 = function(node) {
  var this__9248 = this;
  return this__9248.key
};
cljs.core.RedNode.prototype.cljs$core$IMapEntry$_val$arity$1 = function(node) {
  var this__9249 = this;
  return this__9249.val
};
cljs.core.RedNode.prototype.add_right = function(ins) {
  var this__9250 = this;
  var node__9251 = this;
  return new cljs.core.RedNode(this__9250.key, this__9250.val, this__9250.left, ins, null)
};
cljs.core.RedNode.prototype.redden = function() {
  var this__9252 = this;
  var node__9253 = this;
  throw new Error("red-black tree invariant violation");
};
cljs.core.RedNode.prototype.remove_right = function(del) {
  var this__9254 = this;
  var node__9255 = this;
  return new cljs.core.RedNode(this__9254.key, this__9254.val, this__9254.left, del, null)
};
cljs.core.RedNode.prototype.replace = function(key, val, left, right) {
  var this__9256 = this;
  var node__9257 = this;
  return new cljs.core.RedNode(key, val, left, right, null)
};
cljs.core.RedNode.prototype.kv_reduce = function(f, init) {
  var this__9258 = this;
  var node__9259 = this;
  return cljs.core.tree_map_kv_reduce.call(null, node__9259, f, init)
};
cljs.core.RedNode.prototype.remove_left = function(del) {
  var this__9260 = this;
  var node__9261 = this;
  return new cljs.core.RedNode(this__9260.key, this__9260.val, del, this__9260.right, null)
};
cljs.core.RedNode.prototype.add_left = function(ins) {
  var this__9262 = this;
  var node__9263 = this;
  return new cljs.core.RedNode(this__9262.key, this__9262.val, ins, this__9262.right, null)
};
cljs.core.RedNode.prototype.balance_left = function(parent) {
  var this__9264 = this;
  var node__9265 = this;
  if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, this__9264.left)) {
    return new cljs.core.RedNode(this__9264.key, this__9264.val, this__9264.left.blacken(), new cljs.core.BlackNode(parent.key, parent.val, this__9264.right, parent.right, null), null)
  }else {
    if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, this__9264.right)) {
      return new cljs.core.RedNode(this__9264.right.key, this__9264.right.val, new cljs.core.BlackNode(this__9264.key, this__9264.val, this__9264.left, this__9264.right.left, null), new cljs.core.BlackNode(parent.key, parent.val, this__9264.right.right, parent.right, null), null)
    }else {
      if("\ufdd0'else") {
        return new cljs.core.BlackNode(parent.key, parent.val, node__9265, parent.right, null)
      }else {
        return null
      }
    }
  }
};
cljs.core.RedNode.prototype.toString = function() {
  var G__9287 = null;
  var G__9287__0 = function() {
    var this__9266 = this;
    var this__9268 = this;
    return cljs.core.pr_str.call(null, this__9268)
  };
  G__9287 = function() {
    switch(arguments.length) {
      case 0:
        return G__9287__0.call(this)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9287
}();
cljs.core.RedNode.prototype.balance_right = function(parent) {
  var this__9269 = this;
  var node__9270 = this;
  if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, this__9269.right)) {
    return new cljs.core.RedNode(this__9269.key, this__9269.val, new cljs.core.BlackNode(parent.key, parent.val, parent.left, this__9269.left, null), this__9269.right.blacken(), null)
  }else {
    if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, this__9269.left)) {
      return new cljs.core.RedNode(this__9269.left.key, this__9269.left.val, new cljs.core.BlackNode(parent.key, parent.val, parent.left, this__9269.left.left, null), new cljs.core.BlackNode(this__9269.key, this__9269.val, this__9269.left.right, this__9269.right, null), null)
    }else {
      if("\ufdd0'else") {
        return new cljs.core.BlackNode(parent.key, parent.val, parent.left, node__9270, null)
      }else {
        return null
      }
    }
  }
};
cljs.core.RedNode.prototype.blacken = function() {
  var this__9271 = this;
  var node__9272 = this;
  return new cljs.core.BlackNode(this__9271.key, this__9271.val, this__9271.left, this__9271.right, null)
};
cljs.core.RedNode.prototype.cljs$core$IReduce$_reduce$arity$2 = function(node, f) {
  var this__9273 = this;
  return cljs.core.ci_reduce.call(null, node, f)
};
cljs.core.RedNode.prototype.cljs$core$IReduce$_reduce$arity$3 = function(node, f, start) {
  var this__9274 = this;
  return cljs.core.ci_reduce.call(null, node, f, start)
};
cljs.core.RedNode.prototype.cljs$core$ISeqable$_seq$arity$1 = function(node) {
  var this__9275 = this;
  return cljs.core.list.call(null, this__9275.key, this__9275.val)
};
cljs.core.RedNode.prototype.cljs$core$ICounted$_count$arity$1 = function(node) {
  var this__9276 = this;
  return 2
};
cljs.core.RedNode.prototype.cljs$core$IStack$_peek$arity$1 = function(node) {
  var this__9277 = this;
  return this__9277.val
};
cljs.core.RedNode.prototype.cljs$core$IStack$_pop$arity$1 = function(node) {
  var this__9278 = this;
  return cljs.core.PersistentVector.fromArray([this__9278.key], true)
};
cljs.core.RedNode.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(node, n, v) {
  var this__9279 = this;
  return cljs.core._assoc_n.call(null, cljs.core.PersistentVector.fromArray([this__9279.key, this__9279.val], true), n, v)
};
cljs.core.RedNode.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9280 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.RedNode.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(node, meta) {
  var this__9281 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentVector.fromArray([this__9281.key, this__9281.val], true), meta)
};
cljs.core.RedNode.prototype.cljs$core$IMeta$_meta$arity$1 = function(node) {
  var this__9282 = this;
  return null
};
cljs.core.RedNode.prototype.cljs$core$IIndexed$_nth$arity$2 = function(node, n) {
  var this__9283 = this;
  if(n === 0) {
    return this__9283.key
  }else {
    if(n === 1) {
      return this__9283.val
    }else {
      if("\ufdd0'else") {
        return null
      }else {
        return null
      }
    }
  }
};
cljs.core.RedNode.prototype.cljs$core$IIndexed$_nth$arity$3 = function(node, n, not_found) {
  var this__9284 = this;
  if(n === 0) {
    return this__9284.key
  }else {
    if(n === 1) {
      return this__9284.val
    }else {
      if("\ufdd0'else") {
        return not_found
      }else {
        return null
      }
    }
  }
};
cljs.core.RedNode.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(node) {
  var this__9285 = this;
  return cljs.core.PersistentVector.EMPTY
};
cljs.core.RedNode;
cljs.core.tree_map_add = function tree_map_add(comp, tree, k, v, found) {
  if(tree == null) {
    return new cljs.core.RedNode(k, v, null, null, null)
  }else {
    var c__9291 = comp.call(null, k, tree.key);
    if(c__9291 === 0) {
      found[0] = tree;
      return null
    }else {
      if(c__9291 < 0) {
        var ins__9292 = tree_map_add.call(null, comp, tree.left, k, v, found);
        if(!(ins__9292 == null)) {
          return tree.add_left(ins__9292)
        }else {
          return null
        }
      }else {
        if("\ufdd0'else") {
          var ins__9293 = tree_map_add.call(null, comp, tree.right, k, v, found);
          if(!(ins__9293 == null)) {
            return tree.add_right(ins__9293)
          }else {
            return null
          }
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.tree_map_append = function tree_map_append(left, right) {
  if(left == null) {
    return right
  }else {
    if(right == null) {
      return left
    }else {
      if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, left)) {
        if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, right)) {
          var app__9296 = tree_map_append.call(null, left.right, right.left);
          if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, app__9296)) {
            return new cljs.core.RedNode(app__9296.key, app__9296.val, new cljs.core.RedNode(left.key, left.val, left.left, app__9296.left, null), new cljs.core.RedNode(right.key, right.val, app__9296.right, right.right, null), null)
          }else {
            return new cljs.core.RedNode(left.key, left.val, left.left, new cljs.core.RedNode(right.key, right.val, app__9296, right.right, null), null)
          }
        }else {
          return new cljs.core.RedNode(left.key, left.val, left.left, tree_map_append.call(null, left.right, right), null)
        }
      }else {
        if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, right)) {
          return new cljs.core.RedNode(right.key, right.val, tree_map_append.call(null, left, right.left), right.right, null)
        }else {
          if("\ufdd0'else") {
            var app__9297 = tree_map_append.call(null, left.right, right.left);
            if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, app__9297)) {
              return new cljs.core.RedNode(app__9297.key, app__9297.val, new cljs.core.BlackNode(left.key, left.val, left.left, app__9297.left, null), new cljs.core.BlackNode(right.key, right.val, app__9297.right, right.right, null), null)
            }else {
              return cljs.core.balance_left_del.call(null, left.key, left.val, left.left, new cljs.core.BlackNode(right.key, right.val, app__9297, right.right, null))
            }
          }else {
            return null
          }
        }
      }
    }
  }
};
cljs.core.tree_map_remove = function tree_map_remove(comp, tree, k, found) {
  if(!(tree == null)) {
    var c__9303 = comp.call(null, k, tree.key);
    if(c__9303 === 0) {
      found[0] = tree;
      return cljs.core.tree_map_append.call(null, tree.left, tree.right)
    }else {
      if(c__9303 < 0) {
        var del__9304 = tree_map_remove.call(null, comp, tree.left, k, found);
        if(function() {
          var or__3824__auto____9305 = !(del__9304 == null);
          if(or__3824__auto____9305) {
            return or__3824__auto____9305
          }else {
            return!(found[0] == null)
          }
        }()) {
          if(cljs.core.instance_QMARK_.call(null, cljs.core.BlackNode, tree.left)) {
            return cljs.core.balance_left_del.call(null, tree.key, tree.val, del__9304, tree.right)
          }else {
            return new cljs.core.RedNode(tree.key, tree.val, del__9304, tree.right, null)
          }
        }else {
          return null
        }
      }else {
        if("\ufdd0'else") {
          var del__9306 = tree_map_remove.call(null, comp, tree.right, k, found);
          if(function() {
            var or__3824__auto____9307 = !(del__9306 == null);
            if(or__3824__auto____9307) {
              return or__3824__auto____9307
            }else {
              return!(found[0] == null)
            }
          }()) {
            if(cljs.core.instance_QMARK_.call(null, cljs.core.BlackNode, tree.right)) {
              return cljs.core.balance_right_del.call(null, tree.key, tree.val, tree.left, del__9306)
            }else {
              return new cljs.core.RedNode(tree.key, tree.val, tree.left, del__9306, null)
            }
          }else {
            return null
          }
        }else {
          return null
        }
      }
    }
  }else {
    return null
  }
};
cljs.core.tree_map_replace = function tree_map_replace(comp, tree, k, v) {
  var tk__9310 = tree.key;
  var c__9311 = comp.call(null, k, tk__9310);
  if(c__9311 === 0) {
    return tree.replace(tk__9310, v, tree.left, tree.right)
  }else {
    if(c__9311 < 0) {
      return tree.replace(tk__9310, tree.val, tree_map_replace.call(null, comp, tree.left, k, v), tree.right)
    }else {
      if("\ufdd0'else") {
        return tree.replace(tk__9310, tree.val, tree.left, tree_map_replace.call(null, comp, tree.right, k, v))
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentTreeMap = function(comp, tree, cnt, meta, __hash) {
  this.comp = comp;
  this.tree = tree;
  this.cnt = cnt;
  this.meta = meta;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 418776847
};
cljs.core.PersistentTreeMap.cljs$lang$type = true;
cljs.core.PersistentTreeMap.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/PersistentTreeMap")
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9314 = this;
  var h__2192__auto____9315 = this__9314.__hash;
  if(!(h__2192__auto____9315 == null)) {
    return h__2192__auto____9315
  }else {
    var h__2192__auto____9316 = cljs.core.hash_imap.call(null, coll);
    this__9314.__hash = h__2192__auto____9316;
    return h__2192__auto____9316
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__9317 = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(coll, k, null)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__9318 = this;
  var n__9319 = coll.entry_at(k);
  if(!(n__9319 == null)) {
    return n__9319.val
  }else {
    return not_found
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__9320 = this;
  var found__9321 = [null];
  var t__9322 = cljs.core.tree_map_add.call(null, this__9320.comp, this__9320.tree, k, v, found__9321);
  if(t__9322 == null) {
    var found_node__9323 = cljs.core.nth.call(null, found__9321, 0);
    if(cljs.core._EQ_.call(null, v, found_node__9323.val)) {
      return coll
    }else {
      return new cljs.core.PersistentTreeMap(this__9320.comp, cljs.core.tree_map_replace.call(null, this__9320.comp, this__9320.tree, k, v), this__9320.cnt, this__9320.meta, null)
    }
  }else {
    return new cljs.core.PersistentTreeMap(this__9320.comp, t__9322.blacken(), this__9320.cnt + 1, this__9320.meta, null)
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = function(coll, k) {
  var this__9324 = this;
  return!(coll.entry_at(k) == null)
};
cljs.core.PersistentTreeMap.prototype.call = function() {
  var G__9358 = null;
  var G__9358__2 = function(this_sym9325, k) {
    var this__9327 = this;
    var this_sym9325__9328 = this;
    var coll__9329 = this_sym9325__9328;
    return coll__9329.cljs$core$ILookup$_lookup$arity$2(coll__9329, k)
  };
  var G__9358__3 = function(this_sym9326, k, not_found) {
    var this__9327 = this;
    var this_sym9326__9330 = this;
    var coll__9331 = this_sym9326__9330;
    return coll__9331.cljs$core$ILookup$_lookup$arity$3(coll__9331, k, not_found)
  };
  G__9358 = function(this_sym9326, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__9358__2.call(this, this_sym9326, k);
      case 3:
        return G__9358__3.call(this, this_sym9326, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9358
}();
cljs.core.PersistentTreeMap.prototype.apply = function(this_sym9312, args9313) {
  var this__9332 = this;
  return this_sym9312.call.apply(this_sym9312, [this_sym9312].concat(args9313.slice()))
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = function(coll, f, init) {
  var this__9333 = this;
  if(!(this__9333.tree == null)) {
    return cljs.core.tree_map_kv_reduce.call(null, this__9333.tree, f, init)
  }else {
    return init
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, entry) {
  var this__9334 = this;
  if(cljs.core.vector_QMARK_.call(null, entry)) {
    return coll.cljs$core$IAssociative$_assoc$arity$3(coll, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1))
  }else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll, entry)
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IReversible$_rseq$arity$1 = function(coll) {
  var this__9335 = this;
  if(this__9335.cnt > 0) {
    return cljs.core.create_tree_map_seq.call(null, this__9335.tree, false, this__9335.cnt)
  }else {
    return null
  }
};
cljs.core.PersistentTreeMap.prototype.toString = function() {
  var this__9336 = this;
  var this__9337 = this;
  return cljs.core.pr_str.call(null, this__9337)
};
cljs.core.PersistentTreeMap.prototype.entry_at = function(k) {
  var this__9338 = this;
  var coll__9339 = this;
  var t__9340 = this__9338.tree;
  while(true) {
    if(!(t__9340 == null)) {
      var c__9341 = this__9338.comp.call(null, k, t__9340.key);
      if(c__9341 === 0) {
        return t__9340
      }else {
        if(c__9341 < 0) {
          var G__9359 = t__9340.left;
          t__9340 = G__9359;
          continue
        }else {
          if("\ufdd0'else") {
            var G__9360 = t__9340.right;
            t__9340 = G__9360;
            continue
          }else {
            return null
          }
        }
      }
    }else {
      return null
    }
    break
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISorted$_sorted_seq$arity$2 = function(coll, ascending_QMARK_) {
  var this__9342 = this;
  if(this__9342.cnt > 0) {
    return cljs.core.create_tree_map_seq.call(null, this__9342.tree, ascending_QMARK_, this__9342.cnt)
  }else {
    return null
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISorted$_sorted_seq_from$arity$3 = function(coll, k, ascending_QMARK_) {
  var this__9343 = this;
  if(this__9343.cnt > 0) {
    var stack__9344 = null;
    var t__9345 = this__9343.tree;
    while(true) {
      if(!(t__9345 == null)) {
        var c__9346 = this__9343.comp.call(null, k, t__9345.key);
        if(c__9346 === 0) {
          return new cljs.core.PersistentTreeMapSeq(null, cljs.core.conj.call(null, stack__9344, t__9345), ascending_QMARK_, -1, null)
        }else {
          if(cljs.core.truth_(ascending_QMARK_)) {
            if(c__9346 < 0) {
              var G__9361 = cljs.core.conj.call(null, stack__9344, t__9345);
              var G__9362 = t__9345.left;
              stack__9344 = G__9361;
              t__9345 = G__9362;
              continue
            }else {
              var G__9363 = stack__9344;
              var G__9364 = t__9345.right;
              stack__9344 = G__9363;
              t__9345 = G__9364;
              continue
            }
          }else {
            if("\ufdd0'else") {
              if(c__9346 > 0) {
                var G__9365 = cljs.core.conj.call(null, stack__9344, t__9345);
                var G__9366 = t__9345.right;
                stack__9344 = G__9365;
                t__9345 = G__9366;
                continue
              }else {
                var G__9367 = stack__9344;
                var G__9368 = t__9345.left;
                stack__9344 = G__9367;
                t__9345 = G__9368;
                continue
              }
            }else {
              return null
            }
          }
        }
      }else {
        if(stack__9344 == null) {
          return new cljs.core.PersistentTreeMapSeq(null, stack__9344, ascending_QMARK_, -1, null)
        }else {
          return null
        }
      }
      break
    }
  }else {
    return null
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISorted$_entry_key$arity$2 = function(coll, entry) {
  var this__9347 = this;
  return cljs.core.key.call(null, entry)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISorted$_comparator$arity$1 = function(coll) {
  var this__9348 = this;
  return this__9348.comp
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__9349 = this;
  if(this__9349.cnt > 0) {
    return cljs.core.create_tree_map_seq.call(null, this__9349.tree, true, this__9349.cnt)
  }else {
    return null
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__9350 = this;
  return this__9350.cnt
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9351 = this;
  return cljs.core.equiv_map.call(null, coll, other)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9352 = this;
  return new cljs.core.PersistentTreeMap(this__9352.comp, this__9352.tree, this__9352.cnt, meta, this__9352.__hash)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9353 = this;
  return this__9353.meta
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__9354 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentTreeMap.EMPTY, this__9354.meta)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IMap$_dissoc$arity$2 = function(coll, k) {
  var this__9355 = this;
  var found__9356 = [null];
  var t__9357 = cljs.core.tree_map_remove.call(null, this__9355.comp, this__9355.tree, k, found__9356);
  if(t__9357 == null) {
    if(cljs.core.nth.call(null, found__9356, 0) == null) {
      return coll
    }else {
      return new cljs.core.PersistentTreeMap(this__9355.comp, null, 0, this__9355.meta, null)
    }
  }else {
    return new cljs.core.PersistentTreeMap(this__9355.comp, t__9357.blacken(), this__9355.cnt - 1, this__9355.meta, null)
  }
};
cljs.core.PersistentTreeMap;
cljs.core.PersistentTreeMap.EMPTY = new cljs.core.PersistentTreeMap(cljs.core.compare, null, 0, null, 0);
cljs.core.hash_map = function() {
  var hash_map__delegate = function(keyvals) {
    var in__9371 = cljs.core.seq.call(null, keyvals);
    var out__9372 = cljs.core.transient$.call(null, cljs.core.PersistentHashMap.EMPTY);
    while(true) {
      if(in__9371) {
        var G__9373 = cljs.core.nnext.call(null, in__9371);
        var G__9374 = cljs.core.assoc_BANG_.call(null, out__9372, cljs.core.first.call(null, in__9371), cljs.core.second.call(null, in__9371));
        in__9371 = G__9373;
        out__9372 = G__9374;
        continue
      }else {
        return cljs.core.persistent_BANG_.call(null, out__9372)
      }
      break
    }
  };
  var hash_map = function(var_args) {
    var keyvals = null;
    if(goog.isDef(var_args)) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return hash_map__delegate.call(this, keyvals)
  };
  hash_map.cljs$lang$maxFixedArity = 0;
  hash_map.cljs$lang$applyTo = function(arglist__9375) {
    var keyvals = cljs.core.seq(arglist__9375);
    return hash_map__delegate(keyvals)
  };
  hash_map.cljs$lang$arity$variadic = hash_map__delegate;
  return hash_map
}();
cljs.core.array_map = function() {
  var array_map__delegate = function(keyvals) {
    return new cljs.core.PersistentArrayMap(null, cljs.core.quot.call(null, cljs.core.count.call(null, keyvals), 2), cljs.core.apply.call(null, cljs.core.array, keyvals), null)
  };
  var array_map = function(var_args) {
    var keyvals = null;
    if(goog.isDef(var_args)) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return array_map__delegate.call(this, keyvals)
  };
  array_map.cljs$lang$maxFixedArity = 0;
  array_map.cljs$lang$applyTo = function(arglist__9376) {
    var keyvals = cljs.core.seq(arglist__9376);
    return array_map__delegate(keyvals)
  };
  array_map.cljs$lang$arity$variadic = array_map__delegate;
  return array_map
}();
cljs.core.obj_map = function() {
  var obj_map__delegate = function(keyvals) {
    var ks__9380 = [];
    var obj__9381 = {};
    var kvs__9382 = cljs.core.seq.call(null, keyvals);
    while(true) {
      if(kvs__9382) {
        ks__9380.push(cljs.core.first.call(null, kvs__9382));
        obj__9381[cljs.core.first.call(null, kvs__9382)] = cljs.core.second.call(null, kvs__9382);
        var G__9383 = cljs.core.nnext.call(null, kvs__9382);
        kvs__9382 = G__9383;
        continue
      }else {
        return cljs.core.ObjMap.fromObject.call(null, ks__9380, obj__9381)
      }
      break
    }
  };
  var obj_map = function(var_args) {
    var keyvals = null;
    if(goog.isDef(var_args)) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return obj_map__delegate.call(this, keyvals)
  };
  obj_map.cljs$lang$maxFixedArity = 0;
  obj_map.cljs$lang$applyTo = function(arglist__9384) {
    var keyvals = cljs.core.seq(arglist__9384);
    return obj_map__delegate(keyvals)
  };
  obj_map.cljs$lang$arity$variadic = obj_map__delegate;
  return obj_map
}();
cljs.core.sorted_map = function() {
  var sorted_map__delegate = function(keyvals) {
    var in__9387 = cljs.core.seq.call(null, keyvals);
    var out__9388 = cljs.core.PersistentTreeMap.EMPTY;
    while(true) {
      if(in__9387) {
        var G__9389 = cljs.core.nnext.call(null, in__9387);
        var G__9390 = cljs.core.assoc.call(null, out__9388, cljs.core.first.call(null, in__9387), cljs.core.second.call(null, in__9387));
        in__9387 = G__9389;
        out__9388 = G__9390;
        continue
      }else {
        return out__9388
      }
      break
    }
  };
  var sorted_map = function(var_args) {
    var keyvals = null;
    if(goog.isDef(var_args)) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return sorted_map__delegate.call(this, keyvals)
  };
  sorted_map.cljs$lang$maxFixedArity = 0;
  sorted_map.cljs$lang$applyTo = function(arglist__9391) {
    var keyvals = cljs.core.seq(arglist__9391);
    return sorted_map__delegate(keyvals)
  };
  sorted_map.cljs$lang$arity$variadic = sorted_map__delegate;
  return sorted_map
}();
cljs.core.sorted_map_by = function() {
  var sorted_map_by__delegate = function(comparator, keyvals) {
    var in__9394 = cljs.core.seq.call(null, keyvals);
    var out__9395 = new cljs.core.PersistentTreeMap(comparator, null, 0, null, 0);
    while(true) {
      if(in__9394) {
        var G__9396 = cljs.core.nnext.call(null, in__9394);
        var G__9397 = cljs.core.assoc.call(null, out__9395, cljs.core.first.call(null, in__9394), cljs.core.second.call(null, in__9394));
        in__9394 = G__9396;
        out__9395 = G__9397;
        continue
      }else {
        return out__9395
      }
      break
    }
  };
  var sorted_map_by = function(comparator, var_args) {
    var keyvals = null;
    if(goog.isDef(var_args)) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return sorted_map_by__delegate.call(this, comparator, keyvals)
  };
  sorted_map_by.cljs$lang$maxFixedArity = 1;
  sorted_map_by.cljs$lang$applyTo = function(arglist__9398) {
    var comparator = cljs.core.first(arglist__9398);
    var keyvals = cljs.core.rest(arglist__9398);
    return sorted_map_by__delegate(comparator, keyvals)
  };
  sorted_map_by.cljs$lang$arity$variadic = sorted_map_by__delegate;
  return sorted_map_by
}();
cljs.core.keys = function keys(hash_map) {
  return cljs.core.seq.call(null, cljs.core.map.call(null, cljs.core.first, hash_map))
};
cljs.core.key = function key(map_entry) {
  return cljs.core._key.call(null, map_entry)
};
cljs.core.vals = function vals(hash_map) {
  return cljs.core.seq.call(null, cljs.core.map.call(null, cljs.core.second, hash_map))
};
cljs.core.val = function val(map_entry) {
  return cljs.core._val.call(null, map_entry)
};
cljs.core.merge = function() {
  var merge__delegate = function(maps) {
    if(cljs.core.truth_(cljs.core.some.call(null, cljs.core.identity, maps))) {
      return cljs.core.reduce.call(null, function(p1__9399_SHARP_, p2__9400_SHARP_) {
        return cljs.core.conj.call(null, function() {
          var or__3824__auto____9402 = p1__9399_SHARP_;
          if(cljs.core.truth_(or__3824__auto____9402)) {
            return or__3824__auto____9402
          }else {
            return cljs.core.ObjMap.EMPTY
          }
        }(), p2__9400_SHARP_)
      }, maps)
    }else {
      return null
    }
  };
  var merge = function(var_args) {
    var maps = null;
    if(goog.isDef(var_args)) {
      maps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return merge__delegate.call(this, maps)
  };
  merge.cljs$lang$maxFixedArity = 0;
  merge.cljs$lang$applyTo = function(arglist__9403) {
    var maps = cljs.core.seq(arglist__9403);
    return merge__delegate(maps)
  };
  merge.cljs$lang$arity$variadic = merge__delegate;
  return merge
}();
cljs.core.merge_with = function() {
  var merge_with__delegate = function(f, maps) {
    if(cljs.core.truth_(cljs.core.some.call(null, cljs.core.identity, maps))) {
      var merge_entry__9411 = function(m, e) {
        var k__9409 = cljs.core.first.call(null, e);
        var v__9410 = cljs.core.second.call(null, e);
        if(cljs.core.contains_QMARK_.call(null, m, k__9409)) {
          return cljs.core.assoc.call(null, m, k__9409, f.call(null, cljs.core._lookup.call(null, m, k__9409, null), v__9410))
        }else {
          return cljs.core.assoc.call(null, m, k__9409, v__9410)
        }
      };
      var merge2__9413 = function(m1, m2) {
        return cljs.core.reduce.call(null, merge_entry__9411, function() {
          var or__3824__auto____9412 = m1;
          if(cljs.core.truth_(or__3824__auto____9412)) {
            return or__3824__auto____9412
          }else {
            return cljs.core.ObjMap.EMPTY
          }
        }(), cljs.core.seq.call(null, m2))
      };
      return cljs.core.reduce.call(null, merge2__9413, maps)
    }else {
      return null
    }
  };
  var merge_with = function(f, var_args) {
    var maps = null;
    if(goog.isDef(var_args)) {
      maps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return merge_with__delegate.call(this, f, maps)
  };
  merge_with.cljs$lang$maxFixedArity = 1;
  merge_with.cljs$lang$applyTo = function(arglist__9414) {
    var f = cljs.core.first(arglist__9414);
    var maps = cljs.core.rest(arglist__9414);
    return merge_with__delegate(f, maps)
  };
  merge_with.cljs$lang$arity$variadic = merge_with__delegate;
  return merge_with
}();
cljs.core.select_keys = function select_keys(map, keyseq) {
  var ret__9419 = cljs.core.ObjMap.EMPTY;
  var keys__9420 = cljs.core.seq.call(null, keyseq);
  while(true) {
    if(keys__9420) {
      var key__9421 = cljs.core.first.call(null, keys__9420);
      var entry__9422 = cljs.core._lookup.call(null, map, key__9421, "\ufdd0'cljs.core/not-found");
      var G__9423 = cljs.core.not_EQ_.call(null, entry__9422, "\ufdd0'cljs.core/not-found") ? cljs.core.assoc.call(null, ret__9419, key__9421, entry__9422) : ret__9419;
      var G__9424 = cljs.core.next.call(null, keys__9420);
      ret__9419 = G__9423;
      keys__9420 = G__9424;
      continue
    }else {
      return ret__9419
    }
    break
  }
};
cljs.core.PersistentHashSet = function(meta, hash_map, __hash) {
  this.meta = meta;
  this.hash_map = hash_map;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 1;
  this.cljs$lang$protocol_mask$partition0$ = 15077647
};
cljs.core.PersistentHashSet.cljs$lang$type = true;
cljs.core.PersistentHashSet.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/PersistentHashSet")
};
cljs.core.PersistentHashSet.prototype.cljs$core$IEditableCollection$_as_transient$arity$1 = function(coll) {
  var this__9428 = this;
  return new cljs.core.TransientHashSet(cljs.core.transient$.call(null, this__9428.hash_map))
};
cljs.core.PersistentHashSet.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9429 = this;
  var h__2192__auto____9430 = this__9429.__hash;
  if(!(h__2192__auto____9430 == null)) {
    return h__2192__auto____9430
  }else {
    var h__2192__auto____9431 = cljs.core.hash_iset.call(null, coll);
    this__9429.__hash = h__2192__auto____9431;
    return h__2192__auto____9431
  }
};
cljs.core.PersistentHashSet.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, v) {
  var this__9432 = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(coll, v, null)
};
cljs.core.PersistentHashSet.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, v, not_found) {
  var this__9433 = this;
  if(cljs.core.truth_(cljs.core._contains_key_QMARK_.call(null, this__9433.hash_map, v))) {
    return v
  }else {
    return not_found
  }
};
cljs.core.PersistentHashSet.prototype.call = function() {
  var G__9454 = null;
  var G__9454__2 = function(this_sym9434, k) {
    var this__9436 = this;
    var this_sym9434__9437 = this;
    var coll__9438 = this_sym9434__9437;
    return coll__9438.cljs$core$ILookup$_lookup$arity$2(coll__9438, k)
  };
  var G__9454__3 = function(this_sym9435, k, not_found) {
    var this__9436 = this;
    var this_sym9435__9439 = this;
    var coll__9440 = this_sym9435__9439;
    return coll__9440.cljs$core$ILookup$_lookup$arity$3(coll__9440, k, not_found)
  };
  G__9454 = function(this_sym9435, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__9454__2.call(this, this_sym9435, k);
      case 3:
        return G__9454__3.call(this, this_sym9435, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9454
}();
cljs.core.PersistentHashSet.prototype.apply = function(this_sym9426, args9427) {
  var this__9441 = this;
  return this_sym9426.call.apply(this_sym9426, [this_sym9426].concat(args9427.slice()))
};
cljs.core.PersistentHashSet.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__9442 = this;
  return new cljs.core.PersistentHashSet(this__9442.meta, cljs.core.assoc.call(null, this__9442.hash_map, o, null), null)
};
cljs.core.PersistentHashSet.prototype.toString = function() {
  var this__9443 = this;
  var this__9444 = this;
  return cljs.core.pr_str.call(null, this__9444)
};
cljs.core.PersistentHashSet.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__9445 = this;
  return cljs.core.keys.call(null, this__9445.hash_map)
};
cljs.core.PersistentHashSet.prototype.cljs$core$ISet$_disjoin$arity$2 = function(coll, v) {
  var this__9446 = this;
  return new cljs.core.PersistentHashSet(this__9446.meta, cljs.core.dissoc.call(null, this__9446.hash_map, v), null)
};
cljs.core.PersistentHashSet.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__9447 = this;
  return cljs.core.count.call(null, cljs.core.seq.call(null, coll))
};
cljs.core.PersistentHashSet.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9448 = this;
  var and__3822__auto____9449 = cljs.core.set_QMARK_.call(null, other);
  if(and__3822__auto____9449) {
    var and__3822__auto____9450 = cljs.core.count.call(null, coll) === cljs.core.count.call(null, other);
    if(and__3822__auto____9450) {
      return cljs.core.every_QMARK_.call(null, function(p1__9425_SHARP_) {
        return cljs.core.contains_QMARK_.call(null, coll, p1__9425_SHARP_)
      }, other)
    }else {
      return and__3822__auto____9450
    }
  }else {
    return and__3822__auto____9449
  }
};
cljs.core.PersistentHashSet.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9451 = this;
  return new cljs.core.PersistentHashSet(meta, this__9451.hash_map, this__9451.__hash)
};
cljs.core.PersistentHashSet.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9452 = this;
  return this__9452.meta
};
cljs.core.PersistentHashSet.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__9453 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentHashSet.EMPTY, this__9453.meta)
};
cljs.core.PersistentHashSet;
cljs.core.PersistentHashSet.EMPTY = new cljs.core.PersistentHashSet(null, cljs.core.hash_map.call(null), 0);
cljs.core.PersistentHashSet.fromArray = function(items) {
  var len__9455 = cljs.core.count.call(null, items);
  var i__9456 = 0;
  var out__9457 = cljs.core.transient$.call(null, cljs.core.PersistentHashSet.EMPTY);
  while(true) {
    if(i__9456 < len__9455) {
      var G__9458 = i__9456 + 1;
      var G__9459 = cljs.core.conj_BANG_.call(null, out__9457, items[i__9456]);
      i__9456 = G__9458;
      out__9457 = G__9459;
      continue
    }else {
      return cljs.core.persistent_BANG_.call(null, out__9457)
    }
    break
  }
};
cljs.core.TransientHashSet = function(transient_map) {
  this.transient_map = transient_map;
  this.cljs$lang$protocol_mask$partition0$ = 259;
  this.cljs$lang$protocol_mask$partition1$ = 34
};
cljs.core.TransientHashSet.cljs$lang$type = true;
cljs.core.TransientHashSet.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/TransientHashSet")
};
cljs.core.TransientHashSet.prototype.call = function() {
  var G__9477 = null;
  var G__9477__2 = function(this_sym9463, k) {
    var this__9465 = this;
    var this_sym9463__9466 = this;
    var tcoll__9467 = this_sym9463__9466;
    if(cljs.core._lookup.call(null, this__9465.transient_map, k, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel) {
      return null
    }else {
      return k
    }
  };
  var G__9477__3 = function(this_sym9464, k, not_found) {
    var this__9465 = this;
    var this_sym9464__9468 = this;
    var tcoll__9469 = this_sym9464__9468;
    if(cljs.core._lookup.call(null, this__9465.transient_map, k, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel) {
      return not_found
    }else {
      return k
    }
  };
  G__9477 = function(this_sym9464, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__9477__2.call(this, this_sym9464, k);
      case 3:
        return G__9477__3.call(this, this_sym9464, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9477
}();
cljs.core.TransientHashSet.prototype.apply = function(this_sym9461, args9462) {
  var this__9470 = this;
  return this_sym9461.call.apply(this_sym9461, [this_sym9461].concat(args9462.slice()))
};
cljs.core.TransientHashSet.prototype.cljs$core$ILookup$_lookup$arity$2 = function(tcoll, v) {
  var this__9471 = this;
  return tcoll.cljs$core$ILookup$_lookup$arity$3(tcoll, v, null)
};
cljs.core.TransientHashSet.prototype.cljs$core$ILookup$_lookup$arity$3 = function(tcoll, v, not_found) {
  var this__9472 = this;
  if(cljs.core._lookup.call(null, this__9472.transient_map, v, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel) {
    return not_found
  }else {
    return v
  }
};
cljs.core.TransientHashSet.prototype.cljs$core$ICounted$_count$arity$1 = function(tcoll) {
  var this__9473 = this;
  return cljs.core.count.call(null, this__9473.transient_map)
};
cljs.core.TransientHashSet.prototype.cljs$core$ITransientSet$_disjoin_BANG_$arity$2 = function(tcoll, v) {
  var this__9474 = this;
  this__9474.transient_map = cljs.core.dissoc_BANG_.call(null, this__9474.transient_map, v);
  return tcoll
};
cljs.core.TransientHashSet.prototype.cljs$core$ITransientCollection$_conj_BANG_$arity$2 = function(tcoll, o) {
  var this__9475 = this;
  this__9475.transient_map = cljs.core.assoc_BANG_.call(null, this__9475.transient_map, o, null);
  return tcoll
};
cljs.core.TransientHashSet.prototype.cljs$core$ITransientCollection$_persistent_BANG_$arity$1 = function(tcoll) {
  var this__9476 = this;
  return new cljs.core.PersistentHashSet(null, cljs.core.persistent_BANG_.call(null, this__9476.transient_map), null)
};
cljs.core.TransientHashSet;
cljs.core.PersistentTreeSet = function(meta, tree_map, __hash) {
  this.meta = meta;
  this.tree_map = tree_map;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 417730831
};
cljs.core.PersistentTreeSet.cljs$lang$type = true;
cljs.core.PersistentTreeSet.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/PersistentTreeSet")
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__9480 = this;
  var h__2192__auto____9481 = this__9480.__hash;
  if(!(h__2192__auto____9481 == null)) {
    return h__2192__auto____9481
  }else {
    var h__2192__auto____9482 = cljs.core.hash_iset.call(null, coll);
    this__9480.__hash = h__2192__auto____9482;
    return h__2192__auto____9482
  }
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, v) {
  var this__9483 = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(coll, v, null)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, v, not_found) {
  var this__9484 = this;
  if(cljs.core.truth_(cljs.core._contains_key_QMARK_.call(null, this__9484.tree_map, v))) {
    return v
  }else {
    return not_found
  }
};
cljs.core.PersistentTreeSet.prototype.call = function() {
  var G__9510 = null;
  var G__9510__2 = function(this_sym9485, k) {
    var this__9487 = this;
    var this_sym9485__9488 = this;
    var coll__9489 = this_sym9485__9488;
    return coll__9489.cljs$core$ILookup$_lookup$arity$2(coll__9489, k)
  };
  var G__9510__3 = function(this_sym9486, k, not_found) {
    var this__9487 = this;
    var this_sym9486__9490 = this;
    var coll__9491 = this_sym9486__9490;
    return coll__9491.cljs$core$ILookup$_lookup$arity$3(coll__9491, k, not_found)
  };
  G__9510 = function(this_sym9486, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__9510__2.call(this, this_sym9486, k);
      case 3:
        return G__9510__3.call(this, this_sym9486, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__9510
}();
cljs.core.PersistentTreeSet.prototype.apply = function(this_sym9478, args9479) {
  var this__9492 = this;
  return this_sym9478.call.apply(this_sym9478, [this_sym9478].concat(args9479.slice()))
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__9493 = this;
  return new cljs.core.PersistentTreeSet(this__9493.meta, cljs.core.assoc.call(null, this__9493.tree_map, o, null), null)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IReversible$_rseq$arity$1 = function(coll) {
  var this__9494 = this;
  return cljs.core.map.call(null, cljs.core.key, cljs.core.rseq.call(null, this__9494.tree_map))
};
cljs.core.PersistentTreeSet.prototype.toString = function() {
  var this__9495 = this;
  var this__9496 = this;
  return cljs.core.pr_str.call(null, this__9496)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISorted$_sorted_seq$arity$2 = function(coll, ascending_QMARK_) {
  var this__9497 = this;
  return cljs.core.map.call(null, cljs.core.key, cljs.core._sorted_seq.call(null, this__9497.tree_map, ascending_QMARK_))
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISorted$_sorted_seq_from$arity$3 = function(coll, k, ascending_QMARK_) {
  var this__9498 = this;
  return cljs.core.map.call(null, cljs.core.key, cljs.core._sorted_seq_from.call(null, this__9498.tree_map, k, ascending_QMARK_))
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISorted$_entry_key$arity$2 = function(coll, entry) {
  var this__9499 = this;
  return entry
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISorted$_comparator$arity$1 = function(coll) {
  var this__9500 = this;
  return cljs.core._comparator.call(null, this__9500.tree_map)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__9501 = this;
  return cljs.core.keys.call(null, this__9501.tree_map)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISet$_disjoin$arity$2 = function(coll, v) {
  var this__9502 = this;
  return new cljs.core.PersistentTreeSet(this__9502.meta, cljs.core.dissoc.call(null, this__9502.tree_map, v), null)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__9503 = this;
  return cljs.core.count.call(null, this__9503.tree_map)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__9504 = this;
  var and__3822__auto____9505 = cljs.core.set_QMARK_.call(null, other);
  if(and__3822__auto____9505) {
    var and__3822__auto____9506 = cljs.core.count.call(null, coll) === cljs.core.count.call(null, other);
    if(and__3822__auto____9506) {
      return cljs.core.every_QMARK_.call(null, function(p1__9460_SHARP_) {
        return cljs.core.contains_QMARK_.call(null, coll, p1__9460_SHARP_)
      }, other)
    }else {
      return and__3822__auto____9506
    }
  }else {
    return and__3822__auto____9505
  }
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__9507 = this;
  return new cljs.core.PersistentTreeSet(meta, this__9507.tree_map, this__9507.__hash)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__9508 = this;
  return this__9508.meta
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__9509 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentTreeSet.EMPTY, this__9509.meta)
};
cljs.core.PersistentTreeSet;
cljs.core.PersistentTreeSet.EMPTY = new cljs.core.PersistentTreeSet(null, cljs.core.sorted_map.call(null), 0);
cljs.core.hash_set = function() {
  var hash_set = null;
  var hash_set__0 = function() {
    return cljs.core.PersistentHashSet.EMPTY
  };
  var hash_set__1 = function() {
    var G__9515__delegate = function(keys) {
      var in__9513 = cljs.core.seq.call(null, keys);
      var out__9514 = cljs.core.transient$.call(null, cljs.core.PersistentHashSet.EMPTY);
      while(true) {
        if(cljs.core.seq.call(null, in__9513)) {
          var G__9516 = cljs.core.next.call(null, in__9513);
          var G__9517 = cljs.core.conj_BANG_.call(null, out__9514, cljs.core.first.call(null, in__9513));
          in__9513 = G__9516;
          out__9514 = G__9517;
          continue
        }else {
          return cljs.core.persistent_BANG_.call(null, out__9514)
        }
        break
      }
    };
    var G__9515 = function(var_args) {
      var keys = null;
      if(goog.isDef(var_args)) {
        keys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
      }
      return G__9515__delegate.call(this, keys)
    };
    G__9515.cljs$lang$maxFixedArity = 0;
    G__9515.cljs$lang$applyTo = function(arglist__9518) {
      var keys = cljs.core.seq(arglist__9518);
      return G__9515__delegate(keys)
    };
    G__9515.cljs$lang$arity$variadic = G__9515__delegate;
    return G__9515
  }();
  hash_set = function(var_args) {
    var keys = var_args;
    switch(arguments.length) {
      case 0:
        return hash_set__0.call(this);
      default:
        return hash_set__1.cljs$lang$arity$variadic(cljs.core.array_seq(arguments, 0))
    }
    throw"Invalid arity: " + arguments.length;
  };
  hash_set.cljs$lang$maxFixedArity = 0;
  hash_set.cljs$lang$applyTo = hash_set__1.cljs$lang$applyTo;
  hash_set.cljs$lang$arity$0 = hash_set__0;
  hash_set.cljs$lang$arity$variadic = hash_set__1.cljs$lang$arity$variadic;
  return hash_set
}();
cljs.core.set = function set(coll) {
  return cljs.core.apply.call(null, cljs.core.hash_set, coll)
};
cljs.core.sorted_set = function() {
  var sorted_set__delegate = function(keys) {
    return cljs.core.reduce.call(null, cljs.core._conj, cljs.core.PersistentTreeSet.EMPTY, keys)
  };
  var sorted_set = function(var_args) {
    var keys = null;
    if(goog.isDef(var_args)) {
      keys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return sorted_set__delegate.call(this, keys)
  };
  sorted_set.cljs$lang$maxFixedArity = 0;
  sorted_set.cljs$lang$applyTo = function(arglist__9519) {
    var keys = cljs.core.seq(arglist__9519);
    return sorted_set__delegate(keys)
  };
  sorted_set.cljs$lang$arity$variadic = sorted_set__delegate;
  return sorted_set
}();
cljs.core.sorted_set_by = function() {
  var sorted_set_by__delegate = function(comparator, keys) {
    return cljs.core.reduce.call(null, cljs.core._conj, new cljs.core.PersistentTreeSet(null, cljs.core.sorted_map_by.call(null, comparator), 0), keys)
  };
  var sorted_set_by = function(comparator, var_args) {
    var keys = null;
    if(goog.isDef(var_args)) {
      keys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return sorted_set_by__delegate.call(this, comparator, keys)
  };
  sorted_set_by.cljs$lang$maxFixedArity = 1;
  sorted_set_by.cljs$lang$applyTo = function(arglist__9521) {
    var comparator = cljs.core.first(arglist__9521);
    var keys = cljs.core.rest(arglist__9521);
    return sorted_set_by__delegate(comparator, keys)
  };
  sorted_set_by.cljs$lang$arity$variadic = sorted_set_by__delegate;
  return sorted_set_by
}();
cljs.core.replace = function replace(smap, coll) {
  if(cljs.core.vector_QMARK_.call(null, coll)) {
    var n__9527 = cljs.core.count.call(null, coll);
    return cljs.core.reduce.call(null, function(v, i) {
      var temp__3971__auto____9528 = cljs.core.find.call(null, smap, cljs.core.nth.call(null, v, i));
      if(cljs.core.truth_(temp__3971__auto____9528)) {
        var e__9529 = temp__3971__auto____9528;
        return cljs.core.assoc.call(null, v, i, cljs.core.second.call(null, e__9529))
      }else {
        return v
      }
    }, coll, cljs.core.take.call(null, n__9527, cljs.core.iterate.call(null, cljs.core.inc, 0)))
  }else {
    return cljs.core.map.call(null, function(p1__9520_SHARP_) {
      var temp__3971__auto____9530 = cljs.core.find.call(null, smap, p1__9520_SHARP_);
      if(cljs.core.truth_(temp__3971__auto____9530)) {
        var e__9531 = temp__3971__auto____9530;
        return cljs.core.second.call(null, e__9531)
      }else {
        return p1__9520_SHARP_
      }
    }, coll)
  }
};
cljs.core.distinct = function distinct(coll) {
  var step__9561 = function step(xs, seen) {
    return new cljs.core.LazySeq(null, false, function() {
      return function(p__9554, seen) {
        while(true) {
          var vec__9555__9556 = p__9554;
          var f__9557 = cljs.core.nth.call(null, vec__9555__9556, 0, null);
          var xs__9558 = vec__9555__9556;
          var temp__3974__auto____9559 = cljs.core.seq.call(null, xs__9558);
          if(temp__3974__auto____9559) {
            var s__9560 = temp__3974__auto____9559;
            if(cljs.core.contains_QMARK_.call(null, seen, f__9557)) {
              var G__9562 = cljs.core.rest.call(null, s__9560);
              var G__9563 = seen;
              p__9554 = G__9562;
              seen = G__9563;
              continue
            }else {
              return cljs.core.cons.call(null, f__9557, step.call(null, cljs.core.rest.call(null, s__9560), cljs.core.conj.call(null, seen, f__9557)))
            }
          }else {
            return null
          }
          break
        }
      }.call(null, xs, seen)
    }, null)
  };
  return step__9561.call(null, coll, cljs.core.PersistentHashSet.EMPTY)
};
cljs.core.butlast = function butlast(s) {
  var ret__9566 = cljs.core.PersistentVector.EMPTY;
  var s__9567 = s;
  while(true) {
    if(cljs.core.next.call(null, s__9567)) {
      var G__9568 = cljs.core.conj.call(null, ret__9566, cljs.core.first.call(null, s__9567));
      var G__9569 = cljs.core.next.call(null, s__9567);
      ret__9566 = G__9568;
      s__9567 = G__9569;
      continue
    }else {
      return cljs.core.seq.call(null, ret__9566)
    }
    break
  }
};
cljs.core.name = function name(x) {
  if(cljs.core.string_QMARK_.call(null, x)) {
    return x
  }else {
    if(function() {
      var or__3824__auto____9572 = cljs.core.keyword_QMARK_.call(null, x);
      if(or__3824__auto____9572) {
        return or__3824__auto____9572
      }else {
        return cljs.core.symbol_QMARK_.call(null, x)
      }
    }()) {
      var i__9573 = x.lastIndexOf("/");
      if(i__9573 < 0) {
        return cljs.core.subs.call(null, x, 2)
      }else {
        return cljs.core.subs.call(null, x, i__9573 + 1)
      }
    }else {
      if("\ufdd0'else") {
        throw new Error([cljs.core.str("Doesn't support name: "), cljs.core.str(x)].join(""));
      }else {
        return null
      }
    }
  }
};
cljs.core.namespace = function namespace(x) {
  if(function() {
    var or__3824__auto____9576 = cljs.core.keyword_QMARK_.call(null, x);
    if(or__3824__auto____9576) {
      return or__3824__auto____9576
    }else {
      return cljs.core.symbol_QMARK_.call(null, x)
    }
  }()) {
    var i__9577 = x.lastIndexOf("/");
    if(i__9577 > -1) {
      return cljs.core.subs.call(null, x, 2, i__9577)
    }else {
      return null
    }
  }else {
    throw new Error([cljs.core.str("Doesn't support namespace: "), cljs.core.str(x)].join(""));
  }
};
cljs.core.zipmap = function zipmap(keys, vals) {
  var map__9584 = cljs.core.ObjMap.EMPTY;
  var ks__9585 = cljs.core.seq.call(null, keys);
  var vs__9586 = cljs.core.seq.call(null, vals);
  while(true) {
    if(function() {
      var and__3822__auto____9587 = ks__9585;
      if(and__3822__auto____9587) {
        return vs__9586
      }else {
        return and__3822__auto____9587
      }
    }()) {
      var G__9588 = cljs.core.assoc.call(null, map__9584, cljs.core.first.call(null, ks__9585), cljs.core.first.call(null, vs__9586));
      var G__9589 = cljs.core.next.call(null, ks__9585);
      var G__9590 = cljs.core.next.call(null, vs__9586);
      map__9584 = G__9588;
      ks__9585 = G__9589;
      vs__9586 = G__9590;
      continue
    }else {
      return map__9584
    }
    break
  }
};
cljs.core.max_key = function() {
  var max_key = null;
  var max_key__2 = function(k, x) {
    return x
  };
  var max_key__3 = function(k, x, y) {
    if(k.call(null, x) > k.call(null, y)) {
      return x
    }else {
      return y
    }
  };
  var max_key__4 = function() {
    var G__9593__delegate = function(k, x, y, more) {
      return cljs.core.reduce.call(null, function(p1__9578_SHARP_, p2__9579_SHARP_) {
        return max_key.call(null, k, p1__9578_SHARP_, p2__9579_SHARP_)
      }, max_key.call(null, k, x, y), more)
    };
    var G__9593 = function(k, x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__9593__delegate.call(this, k, x, y, more)
    };
    G__9593.cljs$lang$maxFixedArity = 3;
    G__9593.cljs$lang$applyTo = function(arglist__9594) {
      var k = cljs.core.first(arglist__9594);
      var x = cljs.core.first(cljs.core.next(arglist__9594));
      var y = cljs.core.first(cljs.core.next(cljs.core.next(arglist__9594)));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__9594)));
      return G__9593__delegate(k, x, y, more)
    };
    G__9593.cljs$lang$arity$variadic = G__9593__delegate;
    return G__9593
  }();
  max_key = function(k, x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return max_key__2.call(this, k, x);
      case 3:
        return max_key__3.call(this, k, x, y);
      default:
        return max_key__4.cljs$lang$arity$variadic(k, x, y, cljs.core.array_seq(arguments, 3))
    }
    throw"Invalid arity: " + arguments.length;
  };
  max_key.cljs$lang$maxFixedArity = 3;
  max_key.cljs$lang$applyTo = max_key__4.cljs$lang$applyTo;
  max_key.cljs$lang$arity$2 = max_key__2;
  max_key.cljs$lang$arity$3 = max_key__3;
  max_key.cljs$lang$arity$variadic = max_key__4.cljs$lang$arity$variadic;
  return max_key
}();
cljs.core.min_key = function() {
  var min_key = null;
  var min_key__2 = function(k, x) {
    return x
  };
  var min_key__3 = function(k, x, y) {
    if(k.call(null, x) < k.call(null, y)) {
      return x
    }else {
      return y
    }
  };
  var min_key__4 = function() {
    var G__9595__delegate = function(k, x, y, more) {
      return cljs.core.reduce.call(null, function(p1__9591_SHARP_, p2__9592_SHARP_) {
        return min_key.call(null, k, p1__9591_SHARP_, p2__9592_SHARP_)
      }, min_key.call(null, k, x, y), more)
    };
    var G__9595 = function(k, x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__9595__delegate.call(this, k, x, y, more)
    };
    G__9595.cljs$lang$maxFixedArity = 3;
    G__9595.cljs$lang$applyTo = function(arglist__9596) {
      var k = cljs.core.first(arglist__9596);
      var x = cljs.core.first(cljs.core.next(arglist__9596));
      var y = cljs.core.first(cljs.core.next(cljs.core.next(arglist__9596)));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__9596)));
      return G__9595__delegate(k, x, y, more)
    };
    G__9595.cljs$lang$arity$variadic = G__9595__delegate;
    return G__9595
  }();
  min_key = function(k, x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return min_key__2.call(this, k, x);
      case 3:
        return min_key__3.call(this, k, x, y);
      default:
        return min_key__4.cljs$lang$arity$variadic(k, x, y, cljs.core.array_seq(arguments, 3))
    }
    throw"Invalid arity: " + arguments.length;
  };
  min_key.cljs$lang$maxFixedArity = 3;
  min_key.cljs$lang$applyTo = min_key__4.cljs$lang$applyTo;
  min_key.cljs$lang$arity$2 = min_key__2;
  min_key.cljs$lang$arity$3 = min_key__3;
  min_key.cljs$lang$arity$variadic = min_key__4.cljs$lang$arity$variadic;
  return min_key
}();
cljs.core.partition_all = function() {
  var partition_all = null;
  var partition_all__2 = function(n, coll) {
    return partition_all.call(null, n, n, coll)
  };
  var partition_all__3 = function(n, step, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____9599 = cljs.core.seq.call(null, coll);
      if(temp__3974__auto____9599) {
        var s__9600 = temp__3974__auto____9599;
        return cljs.core.cons.call(null, cljs.core.take.call(null, n, s__9600), partition_all.call(null, n, step, cljs.core.drop.call(null, step, s__9600)))
      }else {
        return null
      }
    }, null)
  };
  partition_all = function(n, step, coll) {
    switch(arguments.length) {
      case 2:
        return partition_all__2.call(this, n, step);
      case 3:
        return partition_all__3.call(this, n, step, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  partition_all.cljs$lang$arity$2 = partition_all__2;
  partition_all.cljs$lang$arity$3 = partition_all__3;
  return partition_all
}();
cljs.core.take_while = function take_while(pred, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3974__auto____9603 = cljs.core.seq.call(null, coll);
    if(temp__3974__auto____9603) {
      var s__9604 = temp__3974__auto____9603;
      if(cljs.core.truth_(pred.call(null, cljs.core.first.call(null, s__9604)))) {
        return cljs.core.cons.call(null, cljs.core.first.call(null, s__9604), take_while.call(null, pred, cljs.core.rest.call(null, s__9604)))
      }else {
        return null
      }
    }else {
      return null
    }
  }, null)
};
cljs.core.mk_bound_fn = function mk_bound_fn(sc, test, key) {
  return function(e) {
    var comp__9606 = cljs.core._comparator.call(null, sc);
    return test.call(null, comp__9606.call(null, cljs.core._entry_key.call(null, sc, e), key), 0)
  }
};
cljs.core.subseq = function() {
  var subseq = null;
  var subseq__3 = function(sc, test, key) {
    var include__9618 = cljs.core.mk_bound_fn.call(null, sc, test, key);
    if(cljs.core.truth_(cljs.core.PersistentHashSet.fromArray([cljs.core._GT_, cljs.core._GT__EQ_]).call(null, test))) {
      var temp__3974__auto____9619 = cljs.core._sorted_seq_from.call(null, sc, key, true);
      if(cljs.core.truth_(temp__3974__auto____9619)) {
        var vec__9620__9621 = temp__3974__auto____9619;
        var e__9622 = cljs.core.nth.call(null, vec__9620__9621, 0, null);
        var s__9623 = vec__9620__9621;
        if(cljs.core.truth_(include__9618.call(null, e__9622))) {
          return s__9623
        }else {
          return cljs.core.next.call(null, s__9623)
        }
      }else {
        return null
      }
    }else {
      return cljs.core.take_while.call(null, include__9618, cljs.core._sorted_seq.call(null, sc, true))
    }
  };
  var subseq__5 = function(sc, start_test, start_key, end_test, end_key) {
    var temp__3974__auto____9624 = cljs.core._sorted_seq_from.call(null, sc, start_key, true);
    if(cljs.core.truth_(temp__3974__auto____9624)) {
      var vec__9625__9626 = temp__3974__auto____9624;
      var e__9627 = cljs.core.nth.call(null, vec__9625__9626, 0, null);
      var s__9628 = vec__9625__9626;
      return cljs.core.take_while.call(null, cljs.core.mk_bound_fn.call(null, sc, end_test, end_key), cljs.core.truth_(cljs.core.mk_bound_fn.call(null, sc, start_test, start_key).call(null, e__9627)) ? s__9628 : cljs.core.next.call(null, s__9628))
    }else {
      return null
    }
  };
  subseq = function(sc, start_test, start_key, end_test, end_key) {
    switch(arguments.length) {
      case 3:
        return subseq__3.call(this, sc, start_test, start_key);
      case 5:
        return subseq__5.call(this, sc, start_test, start_key, end_test, end_key)
    }
    throw"Invalid arity: " + arguments.length;
  };
  subseq.cljs$lang$arity$3 = subseq__3;
  subseq.cljs$lang$arity$5 = subseq__5;
  return subseq
}();
cljs.core.rsubseq = function() {
  var rsubseq = null;
  var rsubseq__3 = function(sc, test, key) {
    var include__9640 = cljs.core.mk_bound_fn.call(null, sc, test, key);
    if(cljs.core.truth_(cljs.core.PersistentHashSet.fromArray([cljs.core._LT_, cljs.core._LT__EQ_]).call(null, test))) {
      var temp__3974__auto____9641 = cljs.core._sorted_seq_from.call(null, sc, key, false);
      if(cljs.core.truth_(temp__3974__auto____9641)) {
        var vec__9642__9643 = temp__3974__auto____9641;
        var e__9644 = cljs.core.nth.call(null, vec__9642__9643, 0, null);
        var s__9645 = vec__9642__9643;
        if(cljs.core.truth_(include__9640.call(null, e__9644))) {
          return s__9645
        }else {
          return cljs.core.next.call(null, s__9645)
        }
      }else {
        return null
      }
    }else {
      return cljs.core.take_while.call(null, include__9640, cljs.core._sorted_seq.call(null, sc, false))
    }
  };
  var rsubseq__5 = function(sc, start_test, start_key, end_test, end_key) {
    var temp__3974__auto____9646 = cljs.core._sorted_seq_from.call(null, sc, end_key, false);
    if(cljs.core.truth_(temp__3974__auto____9646)) {
      var vec__9647__9648 = temp__3974__auto____9646;
      var e__9649 = cljs.core.nth.call(null, vec__9647__9648, 0, null);
      var s__9650 = vec__9647__9648;
      return cljs.core.take_while.call(null, cljs.core.mk_bound_fn.call(null, sc, start_test, start_key), cljs.core.truth_(cljs.core.mk_bound_fn.call(null, sc, end_test, end_key).call(null, e__9649)) ? s__9650 : cljs.core.next.call(null, s__9650))
    }else {
      return null
    }
  };
  rsubseq = function(sc, start_test, start_key, end_test, end_key) {
    switch(arguments.length) {
      case 3:
        return rsubseq__3.call(this, sc, start_test, start_key);
      case 5:
        return rsubseq__5.call(this, sc, start_test, start_key, end_test, end_key)
    }
    throw"Invalid arity: " + arguments.length;
  };
  rsubseq.cljs$lang$arity$3 = rsubseq__3;
  rsubseq.cljs$lang$arity$5 = rsubseq__5;
  return rsubseq
}();
cljs.core.Range = function(meta, start, end, step, __hash) {
  this.meta = meta;
  this.start = start;
  this.end = end;
  this.step = step;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32375006
};
cljs.core.Range.cljs$lang$type = true;
cljs.core.Range.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/Range")
};
cljs.core.Range.prototype.cljs$core$IHash$_hash$arity$1 = function(rng) {
  var this__9651 = this;
  var h__2192__auto____9652 = this__9651.__hash;
  if(!(h__2192__auto____9652 == null)) {
    return h__2192__auto____9652
  }else {
    var h__2192__auto____9653 = cljs.core.hash_coll.call(null, rng);
    this__9651.__hash = h__2192__auto____9653;
    return h__2192__auto____9653
  }
};
cljs.core.Range.prototype.cljs$core$INext$_next$arity$1 = function(rng) {
  var this__9654 = this;
  if(this__9654.step > 0) {
    if(this__9654.start + this__9654.step < this__9654.end) {
      return new cljs.core.Range(this__9654.meta, this__9654.start + this__9654.step, this__9654.end, this__9654.step, null)
    }else {
      return null
    }
  }else {
    if(this__9654.start + this__9654.step > this__9654.end) {
      return new cljs.core.Range(this__9654.meta, this__9654.start + this__9654.step, this__9654.end, this__9654.step, null)
    }else {
      return null
    }
  }
};
cljs.core.Range.prototype.cljs$core$ICollection$_conj$arity$2 = function(rng, o) {
  var this__9655 = this;
  return cljs.core.cons.call(null, o, rng)
};
cljs.core.Range.prototype.toString = function() {
  var this__9656 = this;
  var this__9657 = this;
  return cljs.core.pr_str.call(null, this__9657)
};
cljs.core.Range.prototype.cljs$core$IReduce$_reduce$arity$2 = function(rng, f) {
  var this__9658 = this;
  return cljs.core.ci_reduce.call(null, rng, f)
};
cljs.core.Range.prototype.cljs$core$IReduce$_reduce$arity$3 = function(rng, f, s) {
  var this__9659 = this;
  return cljs.core.ci_reduce.call(null, rng, f, s)
};
cljs.core.Range.prototype.cljs$core$ISeqable$_seq$arity$1 = function(rng) {
  var this__9660 = this;
  if(this__9660.step > 0) {
    if(this__9660.start < this__9660.end) {
      return rng
    }else {
      return null
    }
  }else {
    if(this__9660.start > this__9660.end) {
      return rng
    }else {
      return null
    }
  }
};
cljs.core.Range.prototype.cljs$core$ICounted$_count$arity$1 = function(rng) {
  var this__9661 = this;
  if(cljs.core.not.call(null, rng.cljs$core$ISeqable$_seq$arity$1(rng))) {
    return 0
  }else {
    return Math.ceil((this__9661.end - this__9661.start) / this__9661.step)
  }
};
cljs.core.Range.prototype.cljs$core$ISeq$_first$arity$1 = function(rng) {
  var this__9662 = this;
  return this__9662.start
};
cljs.core.Range.prototype.cljs$core$ISeq$_rest$arity$1 = function(rng) {
  var this__9663 = this;
  if(!(rng.cljs$core$ISeqable$_seq$arity$1(rng) == null)) {
    return new cljs.core.Range(this__9663.meta, this__9663.start + this__9663.step, this__9663.end, this__9663.step, null)
  }else {
    return cljs.core.List.EMPTY
  }
};
cljs.core.Range.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(rng, other) {
  var this__9664 = this;
  return cljs.core.equiv_sequential.call(null, rng, other)
};
cljs.core.Range.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(rng, meta) {
  var this__9665 = this;
  return new cljs.core.Range(meta, this__9665.start, this__9665.end, this__9665.step, this__9665.__hash)
};
cljs.core.Range.prototype.cljs$core$IMeta$_meta$arity$1 = function(rng) {
  var this__9666 = this;
  return this__9666.meta
};
cljs.core.Range.prototype.cljs$core$IIndexed$_nth$arity$2 = function(rng, n) {
  var this__9667 = this;
  if(n < rng.cljs$core$ICounted$_count$arity$1(rng)) {
    return this__9667.start + n * this__9667.step
  }else {
    if(function() {
      var and__3822__auto____9668 = this__9667.start > this__9667.end;
      if(and__3822__auto____9668) {
        return this__9667.step === 0
      }else {
        return and__3822__auto____9668
      }
    }()) {
      return this__9667.start
    }else {
      throw new Error("Index out of bounds");
    }
  }
};
cljs.core.Range.prototype.cljs$core$IIndexed$_nth$arity$3 = function(rng, n, not_found) {
  var this__9669 = this;
  if(n < rng.cljs$core$ICounted$_count$arity$1(rng)) {
    return this__9669.start + n * this__9669.step
  }else {
    if(function() {
      var and__3822__auto____9670 = this__9669.start > this__9669.end;
      if(and__3822__auto____9670) {
        return this__9669.step === 0
      }else {
        return and__3822__auto____9670
      }
    }()) {
      return this__9669.start
    }else {
      return not_found
    }
  }
};
cljs.core.Range.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(rng) {
  var this__9671 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__9671.meta)
};
cljs.core.Range;
cljs.core.range = function() {
  var range = null;
  var range__0 = function() {
    return range.call(null, 0, Number.MAX_VALUE, 1)
  };
  var range__1 = function(end) {
    return range.call(null, 0, end, 1)
  };
  var range__2 = function(start, end) {
    return range.call(null, start, end, 1)
  };
  var range__3 = function(start, end, step) {
    return new cljs.core.Range(null, start, end, step, null)
  };
  range = function(start, end, step) {
    switch(arguments.length) {
      case 0:
        return range__0.call(this);
      case 1:
        return range__1.call(this, start);
      case 2:
        return range__2.call(this, start, end);
      case 3:
        return range__3.call(this, start, end, step)
    }
    throw"Invalid arity: " + arguments.length;
  };
  range.cljs$lang$arity$0 = range__0;
  range.cljs$lang$arity$1 = range__1;
  range.cljs$lang$arity$2 = range__2;
  range.cljs$lang$arity$3 = range__3;
  return range
}();
cljs.core.take_nth = function take_nth(n, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3974__auto____9674 = cljs.core.seq.call(null, coll);
    if(temp__3974__auto____9674) {
      var s__9675 = temp__3974__auto____9674;
      return cljs.core.cons.call(null, cljs.core.first.call(null, s__9675), take_nth.call(null, n, cljs.core.drop.call(null, n, s__9675)))
    }else {
      return null
    }
  }, null)
};
cljs.core.split_with = function split_with(pred, coll) {
  return cljs.core.PersistentVector.fromArray([cljs.core.take_while.call(null, pred, coll), cljs.core.drop_while.call(null, pred, coll)], true)
};
cljs.core.partition_by = function partition_by(f, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3974__auto____9682 = cljs.core.seq.call(null, coll);
    if(temp__3974__auto____9682) {
      var s__9683 = temp__3974__auto____9682;
      var fst__9684 = cljs.core.first.call(null, s__9683);
      var fv__9685 = f.call(null, fst__9684);
      var run__9686 = cljs.core.cons.call(null, fst__9684, cljs.core.take_while.call(null, function(p1__9676_SHARP_) {
        return cljs.core._EQ_.call(null, fv__9685, f.call(null, p1__9676_SHARP_))
      }, cljs.core.next.call(null, s__9683)));
      return cljs.core.cons.call(null, run__9686, partition_by.call(null, f, cljs.core.seq.call(null, cljs.core.drop.call(null, cljs.core.count.call(null, run__9686), s__9683))))
    }else {
      return null
    }
  }, null)
};
cljs.core.frequencies = function frequencies(coll) {
  return cljs.core.persistent_BANG_.call(null, cljs.core.reduce.call(null, function(counts, x) {
    return cljs.core.assoc_BANG_.call(null, counts, x, cljs.core._lookup.call(null, counts, x, 0) + 1)
  }, cljs.core.transient$.call(null, cljs.core.ObjMap.EMPTY), coll))
};
cljs.core.reductions = function() {
  var reductions = null;
  var reductions__2 = function(f, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3971__auto____9701 = cljs.core.seq.call(null, coll);
      if(temp__3971__auto____9701) {
        var s__9702 = temp__3971__auto____9701;
        return reductions.call(null, f, cljs.core.first.call(null, s__9702), cljs.core.rest.call(null, s__9702))
      }else {
        return cljs.core.list.call(null, f.call(null))
      }
    }, null)
  };
  var reductions__3 = function(f, init, coll) {
    return cljs.core.cons.call(null, init, new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____9703 = cljs.core.seq.call(null, coll);
      if(temp__3974__auto____9703) {
        var s__9704 = temp__3974__auto____9703;
        return reductions.call(null, f, f.call(null, init, cljs.core.first.call(null, s__9704)), cljs.core.rest.call(null, s__9704))
      }else {
        return null
      }
    }, null))
  };
  reductions = function(f, init, coll) {
    switch(arguments.length) {
      case 2:
        return reductions__2.call(this, f, init);
      case 3:
        return reductions__3.call(this, f, init, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  reductions.cljs$lang$arity$2 = reductions__2;
  reductions.cljs$lang$arity$3 = reductions__3;
  return reductions
}();
cljs.core.juxt = function() {
  var juxt = null;
  var juxt__1 = function(f) {
    return function() {
      var G__9707 = null;
      var G__9707__0 = function() {
        return cljs.core.vector.call(null, f.call(null))
      };
      var G__9707__1 = function(x) {
        return cljs.core.vector.call(null, f.call(null, x))
      };
      var G__9707__2 = function(x, y) {
        return cljs.core.vector.call(null, f.call(null, x, y))
      };
      var G__9707__3 = function(x, y, z) {
        return cljs.core.vector.call(null, f.call(null, x, y, z))
      };
      var G__9707__4 = function() {
        var G__9708__delegate = function(x, y, z, args) {
          return cljs.core.vector.call(null, cljs.core.apply.call(null, f, x, y, z, args))
        };
        var G__9708 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__9708__delegate.call(this, x, y, z, args)
        };
        G__9708.cljs$lang$maxFixedArity = 3;
        G__9708.cljs$lang$applyTo = function(arglist__9709) {
          var x = cljs.core.first(arglist__9709);
          var y = cljs.core.first(cljs.core.next(arglist__9709));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__9709)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__9709)));
          return G__9708__delegate(x, y, z, args)
        };
        G__9708.cljs$lang$arity$variadic = G__9708__delegate;
        return G__9708
      }();
      G__9707 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__9707__0.call(this);
          case 1:
            return G__9707__1.call(this, x);
          case 2:
            return G__9707__2.call(this, x, y);
          case 3:
            return G__9707__3.call(this, x, y, z);
          default:
            return G__9707__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__9707.cljs$lang$maxFixedArity = 3;
      G__9707.cljs$lang$applyTo = G__9707__4.cljs$lang$applyTo;
      return G__9707
    }()
  };
  var juxt__2 = function(f, g) {
    return function() {
      var G__9710 = null;
      var G__9710__0 = function() {
        return cljs.core.vector.call(null, f.call(null), g.call(null))
      };
      var G__9710__1 = function(x) {
        return cljs.core.vector.call(null, f.call(null, x), g.call(null, x))
      };
      var G__9710__2 = function(x, y) {
        return cljs.core.vector.call(null, f.call(null, x, y), g.call(null, x, y))
      };
      var G__9710__3 = function(x, y, z) {
        return cljs.core.vector.call(null, f.call(null, x, y, z), g.call(null, x, y, z))
      };
      var G__9710__4 = function() {
        var G__9711__delegate = function(x, y, z, args) {
          return cljs.core.vector.call(null, cljs.core.apply.call(null, f, x, y, z, args), cljs.core.apply.call(null, g, x, y, z, args))
        };
        var G__9711 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__9711__delegate.call(this, x, y, z, args)
        };
        G__9711.cljs$lang$maxFixedArity = 3;
        G__9711.cljs$lang$applyTo = function(arglist__9712) {
          var x = cljs.core.first(arglist__9712);
          var y = cljs.core.first(cljs.core.next(arglist__9712));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__9712)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__9712)));
          return G__9711__delegate(x, y, z, args)
        };
        G__9711.cljs$lang$arity$variadic = G__9711__delegate;
        return G__9711
      }();
      G__9710 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__9710__0.call(this);
          case 1:
            return G__9710__1.call(this, x);
          case 2:
            return G__9710__2.call(this, x, y);
          case 3:
            return G__9710__3.call(this, x, y, z);
          default:
            return G__9710__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__9710.cljs$lang$maxFixedArity = 3;
      G__9710.cljs$lang$applyTo = G__9710__4.cljs$lang$applyTo;
      return G__9710
    }()
  };
  var juxt__3 = function(f, g, h) {
    return function() {
      var G__9713 = null;
      var G__9713__0 = function() {
        return cljs.core.vector.call(null, f.call(null), g.call(null), h.call(null))
      };
      var G__9713__1 = function(x) {
        return cljs.core.vector.call(null, f.call(null, x), g.call(null, x), h.call(null, x))
      };
      var G__9713__2 = function(x, y) {
        return cljs.core.vector.call(null, f.call(null, x, y), g.call(null, x, y), h.call(null, x, y))
      };
      var G__9713__3 = function(x, y, z) {
        return cljs.core.vector.call(null, f.call(null, x, y, z), g.call(null, x, y, z), h.call(null, x, y, z))
      };
      var G__9713__4 = function() {
        var G__9714__delegate = function(x, y, z, args) {
          return cljs.core.vector.call(null, cljs.core.apply.call(null, f, x, y, z, args), cljs.core.apply.call(null, g, x, y, z, args), cljs.core.apply.call(null, h, x, y, z, args))
        };
        var G__9714 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__9714__delegate.call(this, x, y, z, args)
        };
        G__9714.cljs$lang$maxFixedArity = 3;
        G__9714.cljs$lang$applyTo = function(arglist__9715) {
          var x = cljs.core.first(arglist__9715);
          var y = cljs.core.first(cljs.core.next(arglist__9715));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__9715)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__9715)));
          return G__9714__delegate(x, y, z, args)
        };
        G__9714.cljs$lang$arity$variadic = G__9714__delegate;
        return G__9714
      }();
      G__9713 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__9713__0.call(this);
          case 1:
            return G__9713__1.call(this, x);
          case 2:
            return G__9713__2.call(this, x, y);
          case 3:
            return G__9713__3.call(this, x, y, z);
          default:
            return G__9713__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__9713.cljs$lang$maxFixedArity = 3;
      G__9713.cljs$lang$applyTo = G__9713__4.cljs$lang$applyTo;
      return G__9713
    }()
  };
  var juxt__4 = function() {
    var G__9716__delegate = function(f, g, h, fs) {
      var fs__9706 = cljs.core.list_STAR_.call(null, f, g, h, fs);
      return function() {
        var G__9717 = null;
        var G__9717__0 = function() {
          return cljs.core.reduce.call(null, function(p1__9687_SHARP_, p2__9688_SHARP_) {
            return cljs.core.conj.call(null, p1__9687_SHARP_, p2__9688_SHARP_.call(null))
          }, cljs.core.PersistentVector.EMPTY, fs__9706)
        };
        var G__9717__1 = function(x) {
          return cljs.core.reduce.call(null, function(p1__9689_SHARP_, p2__9690_SHARP_) {
            return cljs.core.conj.call(null, p1__9689_SHARP_, p2__9690_SHARP_.call(null, x))
          }, cljs.core.PersistentVector.EMPTY, fs__9706)
        };
        var G__9717__2 = function(x, y) {
          return cljs.core.reduce.call(null, function(p1__9691_SHARP_, p2__9692_SHARP_) {
            return cljs.core.conj.call(null, p1__9691_SHARP_, p2__9692_SHARP_.call(null, x, y))
          }, cljs.core.PersistentVector.EMPTY, fs__9706)
        };
        var G__9717__3 = function(x, y, z) {
          return cljs.core.reduce.call(null, function(p1__9693_SHARP_, p2__9694_SHARP_) {
            return cljs.core.conj.call(null, p1__9693_SHARP_, p2__9694_SHARP_.call(null, x, y, z))
          }, cljs.core.PersistentVector.EMPTY, fs__9706)
        };
        var G__9717__4 = function() {
          var G__9718__delegate = function(x, y, z, args) {
            return cljs.core.reduce.call(null, function(p1__9695_SHARP_, p2__9696_SHARP_) {
              return cljs.core.conj.call(null, p1__9695_SHARP_, cljs.core.apply.call(null, p2__9696_SHARP_, x, y, z, args))
            }, cljs.core.PersistentVector.EMPTY, fs__9706)
          };
          var G__9718 = function(x, y, z, var_args) {
            var args = null;
            if(goog.isDef(var_args)) {
              args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
            }
            return G__9718__delegate.call(this, x, y, z, args)
          };
          G__9718.cljs$lang$maxFixedArity = 3;
          G__9718.cljs$lang$applyTo = function(arglist__9719) {
            var x = cljs.core.first(arglist__9719);
            var y = cljs.core.first(cljs.core.next(arglist__9719));
            var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__9719)));
            var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__9719)));
            return G__9718__delegate(x, y, z, args)
          };
          G__9718.cljs$lang$arity$variadic = G__9718__delegate;
          return G__9718
        }();
        G__9717 = function(x, y, z, var_args) {
          var args = var_args;
          switch(arguments.length) {
            case 0:
              return G__9717__0.call(this);
            case 1:
              return G__9717__1.call(this, x);
            case 2:
              return G__9717__2.call(this, x, y);
            case 3:
              return G__9717__3.call(this, x, y, z);
            default:
              return G__9717__4.cljs$lang$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3))
          }
          throw"Invalid arity: " + arguments.length;
        };
        G__9717.cljs$lang$maxFixedArity = 3;
        G__9717.cljs$lang$applyTo = G__9717__4.cljs$lang$applyTo;
        return G__9717
      }()
    };
    var G__9716 = function(f, g, h, var_args) {
      var fs = null;
      if(goog.isDef(var_args)) {
        fs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__9716__delegate.call(this, f, g, h, fs)
    };
    G__9716.cljs$lang$maxFixedArity = 3;
    G__9716.cljs$lang$applyTo = function(arglist__9720) {
      var f = cljs.core.first(arglist__9720);
      var g = cljs.core.first(cljs.core.next(arglist__9720));
      var h = cljs.core.first(cljs.core.next(cljs.core.next(arglist__9720)));
      var fs = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__9720)));
      return G__9716__delegate(f, g, h, fs)
    };
    G__9716.cljs$lang$arity$variadic = G__9716__delegate;
    return G__9716
  }();
  juxt = function(f, g, h, var_args) {
    var fs = var_args;
    switch(arguments.length) {
      case 1:
        return juxt__1.call(this, f);
      case 2:
        return juxt__2.call(this, f, g);
      case 3:
        return juxt__3.call(this, f, g, h);
      default:
        return juxt__4.cljs$lang$arity$variadic(f, g, h, cljs.core.array_seq(arguments, 3))
    }
    throw"Invalid arity: " + arguments.length;
  };
  juxt.cljs$lang$maxFixedArity = 3;
  juxt.cljs$lang$applyTo = juxt__4.cljs$lang$applyTo;
  juxt.cljs$lang$arity$1 = juxt__1;
  juxt.cljs$lang$arity$2 = juxt__2;
  juxt.cljs$lang$arity$3 = juxt__3;
  juxt.cljs$lang$arity$variadic = juxt__4.cljs$lang$arity$variadic;
  return juxt
}();
cljs.core.dorun = function() {
  var dorun = null;
  var dorun__1 = function(coll) {
    while(true) {
      if(cljs.core.seq.call(null, coll)) {
        var G__9723 = cljs.core.next.call(null, coll);
        coll = G__9723;
        continue
      }else {
        return null
      }
      break
    }
  };
  var dorun__2 = function(n, coll) {
    while(true) {
      if(cljs.core.truth_(function() {
        var and__3822__auto____9722 = cljs.core.seq.call(null, coll);
        if(and__3822__auto____9722) {
          return n > 0
        }else {
          return and__3822__auto____9722
        }
      }())) {
        var G__9724 = n - 1;
        var G__9725 = cljs.core.next.call(null, coll);
        n = G__9724;
        coll = G__9725;
        continue
      }else {
        return null
      }
      break
    }
  };
  dorun = function(n, coll) {
    switch(arguments.length) {
      case 1:
        return dorun__1.call(this, n);
      case 2:
        return dorun__2.call(this, n, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  dorun.cljs$lang$arity$1 = dorun__1;
  dorun.cljs$lang$arity$2 = dorun__2;
  return dorun
}();
cljs.core.doall = function() {
  var doall = null;
  var doall__1 = function(coll) {
    cljs.core.dorun.call(null, coll);
    return coll
  };
  var doall__2 = function(n, coll) {
    cljs.core.dorun.call(null, n, coll);
    return coll
  };
  doall = function(n, coll) {
    switch(arguments.length) {
      case 1:
        return doall__1.call(this, n);
      case 2:
        return doall__2.call(this, n, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  doall.cljs$lang$arity$1 = doall__1;
  doall.cljs$lang$arity$2 = doall__2;
  return doall
}();
cljs.core.regexp_QMARK_ = function regexp_QMARK_(o) {
  return o instanceof RegExp
};
cljs.core.re_matches = function re_matches(re, s) {
  var matches__9727 = re.exec(s);
  if(cljs.core._EQ_.call(null, cljs.core.first.call(null, matches__9727), s)) {
    if(cljs.core.count.call(null, matches__9727) === 1) {
      return cljs.core.first.call(null, matches__9727)
    }else {
      return cljs.core.vec.call(null, matches__9727)
    }
  }else {
    return null
  }
};
cljs.core.re_find = function re_find(re, s) {
  var matches__9729 = re.exec(s);
  if(matches__9729 == null) {
    return null
  }else {
    if(cljs.core.count.call(null, matches__9729) === 1) {
      return cljs.core.first.call(null, matches__9729)
    }else {
      return cljs.core.vec.call(null, matches__9729)
    }
  }
};
cljs.core.re_seq = function re_seq(re, s) {
  var match_data__9734 = cljs.core.re_find.call(null, re, s);
  var match_idx__9735 = s.search(re);
  var match_str__9736 = cljs.core.coll_QMARK_.call(null, match_data__9734) ? cljs.core.first.call(null, match_data__9734) : match_data__9734;
  var post_match__9737 = cljs.core.subs.call(null, s, match_idx__9735 + cljs.core.count.call(null, match_str__9736));
  if(cljs.core.truth_(match_data__9734)) {
    return new cljs.core.LazySeq(null, false, function() {
      return cljs.core.cons.call(null, match_data__9734, re_seq.call(null, re, post_match__9737))
    }, null)
  }else {
    return null
  }
};
cljs.core.re_pattern = function re_pattern(s) {
  var vec__9744__9745 = cljs.core.re_find.call(null, /^(?:\(\?([idmsux]*)\))?(.*)/, s);
  var ___9746 = cljs.core.nth.call(null, vec__9744__9745, 0, null);
  var flags__9747 = cljs.core.nth.call(null, vec__9744__9745, 1, null);
  var pattern__9748 = cljs.core.nth.call(null, vec__9744__9745, 2, null);
  return new RegExp(pattern__9748, flags__9747)
};
cljs.core.pr_sequential = function pr_sequential(print_one, begin, sep, end, opts, coll) {
  return cljs.core.concat.call(null, cljs.core.PersistentVector.fromArray([begin], true), cljs.core.flatten1.call(null, cljs.core.interpose.call(null, cljs.core.PersistentVector.fromArray([sep], true), cljs.core.map.call(null, function(p1__9738_SHARP_) {
    return print_one.call(null, p1__9738_SHARP_, opts)
  }, coll))), cljs.core.PersistentVector.fromArray([end], true))
};
cljs.core.string_print = function string_print(x) {
  cljs.core._STAR_print_fn_STAR_.call(null, x);
  return null
};
cljs.core.flush = function flush() {
  return null
};
cljs.core.pr_seq = function pr_seq(obj, opts) {
  if(obj == null) {
    return cljs.core.list.call(null, "nil")
  }else {
    if(void 0 === obj) {
      return cljs.core.list.call(null, "#<undefined>")
    }else {
      if("\ufdd0'else") {
        return cljs.core.concat.call(null, cljs.core.truth_(function() {
          var and__3822__auto____9758 = cljs.core._lookup.call(null, opts, "\ufdd0'meta", null);
          if(cljs.core.truth_(and__3822__auto____9758)) {
            var and__3822__auto____9762 = function() {
              var G__9759__9760 = obj;
              if(G__9759__9760) {
                if(function() {
                  var or__3824__auto____9761 = G__9759__9760.cljs$lang$protocol_mask$partition0$ & 131072;
                  if(or__3824__auto____9761) {
                    return or__3824__auto____9761
                  }else {
                    return G__9759__9760.cljs$core$IMeta$
                  }
                }()) {
                  return true
                }else {
                  if(!G__9759__9760.cljs$lang$protocol_mask$partition0$) {
                    return cljs.core.type_satisfies_.call(null, cljs.core.IMeta, G__9759__9760)
                  }else {
                    return false
                  }
                }
              }else {
                return cljs.core.type_satisfies_.call(null, cljs.core.IMeta, G__9759__9760)
              }
            }();
            if(cljs.core.truth_(and__3822__auto____9762)) {
              return cljs.core.meta.call(null, obj)
            }else {
              return and__3822__auto____9762
            }
          }else {
            return and__3822__auto____9758
          }
        }()) ? cljs.core.concat.call(null, cljs.core.PersistentVector.fromArray(["^"], true), pr_seq.call(null, cljs.core.meta.call(null, obj), opts), cljs.core.PersistentVector.fromArray([" "], true)) : null, function() {
          var and__3822__auto____9763 = !(obj == null);
          if(and__3822__auto____9763) {
            return obj.cljs$lang$type
          }else {
            return and__3822__auto____9763
          }
        }() ? obj.cljs$lang$ctorPrSeq(obj) : function() {
          var G__9764__9765 = obj;
          if(G__9764__9765) {
            if(function() {
              var or__3824__auto____9766 = G__9764__9765.cljs$lang$protocol_mask$partition0$ & 536870912;
              if(or__3824__auto____9766) {
                return or__3824__auto____9766
              }else {
                return G__9764__9765.cljs$core$IPrintable$
              }
            }()) {
              return true
            }else {
              if(!G__9764__9765.cljs$lang$protocol_mask$partition0$) {
                return cljs.core.type_satisfies_.call(null, cljs.core.IPrintable, G__9764__9765)
              }else {
                return false
              }
            }
          }else {
            return cljs.core.type_satisfies_.call(null, cljs.core.IPrintable, G__9764__9765)
          }
        }() ? cljs.core._pr_seq.call(null, obj, opts) : cljs.core.truth_(cljs.core.regexp_QMARK_.call(null, obj)) ? cljs.core.list.call(null, '#"', obj.source, '"') : "\ufdd0'else" ? cljs.core.list.call(null, "#<", [cljs.core.str(obj)].join(""), ">") : null)
      }else {
        return null
      }
    }
  }
};
cljs.core.pr_sb = function pr_sb(objs, opts) {
  var sb__9786 = new goog.string.StringBuffer;
  var G__9787__9788 = cljs.core.seq.call(null, cljs.core.pr_seq.call(null, cljs.core.first.call(null, objs), opts));
  if(G__9787__9788) {
    var string__9789 = cljs.core.first.call(null, G__9787__9788);
    var G__9787__9790 = G__9787__9788;
    while(true) {
      sb__9786.append(string__9789);
      var temp__3974__auto____9791 = cljs.core.next.call(null, G__9787__9790);
      if(temp__3974__auto____9791) {
        var G__9787__9792 = temp__3974__auto____9791;
        var G__9805 = cljs.core.first.call(null, G__9787__9792);
        var G__9806 = G__9787__9792;
        string__9789 = G__9805;
        G__9787__9790 = G__9806;
        continue
      }else {
      }
      break
    }
  }else {
  }
  var G__9793__9794 = cljs.core.seq.call(null, cljs.core.next.call(null, objs));
  if(G__9793__9794) {
    var obj__9795 = cljs.core.first.call(null, G__9793__9794);
    var G__9793__9796 = G__9793__9794;
    while(true) {
      sb__9786.append(" ");
      var G__9797__9798 = cljs.core.seq.call(null, cljs.core.pr_seq.call(null, obj__9795, opts));
      if(G__9797__9798) {
        var string__9799 = cljs.core.first.call(null, G__9797__9798);
        var G__9797__9800 = G__9797__9798;
        while(true) {
          sb__9786.append(string__9799);
          var temp__3974__auto____9801 = cljs.core.next.call(null, G__9797__9800);
          if(temp__3974__auto____9801) {
            var G__9797__9802 = temp__3974__auto____9801;
            var G__9807 = cljs.core.first.call(null, G__9797__9802);
            var G__9808 = G__9797__9802;
            string__9799 = G__9807;
            G__9797__9800 = G__9808;
            continue
          }else {
          }
          break
        }
      }else {
      }
      var temp__3974__auto____9803 = cljs.core.next.call(null, G__9793__9796);
      if(temp__3974__auto____9803) {
        var G__9793__9804 = temp__3974__auto____9803;
        var G__9809 = cljs.core.first.call(null, G__9793__9804);
        var G__9810 = G__9793__9804;
        obj__9795 = G__9809;
        G__9793__9796 = G__9810;
        continue
      }else {
      }
      break
    }
  }else {
  }
  return sb__9786
};
cljs.core.pr_str_with_opts = function pr_str_with_opts(objs, opts) {
  return[cljs.core.str(cljs.core.pr_sb.call(null, objs, opts))].join("")
};
cljs.core.prn_str_with_opts = function prn_str_with_opts(objs, opts) {
  var sb__9812 = cljs.core.pr_sb.call(null, objs, opts);
  sb__9812.append("\n");
  return[cljs.core.str(sb__9812)].join("")
};
cljs.core.pr_with_opts = function pr_with_opts(objs, opts) {
  var G__9831__9832 = cljs.core.seq.call(null, cljs.core.pr_seq.call(null, cljs.core.first.call(null, objs), opts));
  if(G__9831__9832) {
    var string__9833 = cljs.core.first.call(null, G__9831__9832);
    var G__9831__9834 = G__9831__9832;
    while(true) {
      cljs.core.string_print.call(null, string__9833);
      var temp__3974__auto____9835 = cljs.core.next.call(null, G__9831__9834);
      if(temp__3974__auto____9835) {
        var G__9831__9836 = temp__3974__auto____9835;
        var G__9849 = cljs.core.first.call(null, G__9831__9836);
        var G__9850 = G__9831__9836;
        string__9833 = G__9849;
        G__9831__9834 = G__9850;
        continue
      }else {
      }
      break
    }
  }else {
  }
  var G__9837__9838 = cljs.core.seq.call(null, cljs.core.next.call(null, objs));
  if(G__9837__9838) {
    var obj__9839 = cljs.core.first.call(null, G__9837__9838);
    var G__9837__9840 = G__9837__9838;
    while(true) {
      cljs.core.string_print.call(null, " ");
      var G__9841__9842 = cljs.core.seq.call(null, cljs.core.pr_seq.call(null, obj__9839, opts));
      if(G__9841__9842) {
        var string__9843 = cljs.core.first.call(null, G__9841__9842);
        var G__9841__9844 = G__9841__9842;
        while(true) {
          cljs.core.string_print.call(null, string__9843);
          var temp__3974__auto____9845 = cljs.core.next.call(null, G__9841__9844);
          if(temp__3974__auto____9845) {
            var G__9841__9846 = temp__3974__auto____9845;
            var G__9851 = cljs.core.first.call(null, G__9841__9846);
            var G__9852 = G__9841__9846;
            string__9843 = G__9851;
            G__9841__9844 = G__9852;
            continue
          }else {
          }
          break
        }
      }else {
      }
      var temp__3974__auto____9847 = cljs.core.next.call(null, G__9837__9840);
      if(temp__3974__auto____9847) {
        var G__9837__9848 = temp__3974__auto____9847;
        var G__9853 = cljs.core.first.call(null, G__9837__9848);
        var G__9854 = G__9837__9848;
        obj__9839 = G__9853;
        G__9837__9840 = G__9854;
        continue
      }else {
        return null
      }
      break
    }
  }else {
    return null
  }
};
cljs.core.newline = function newline(opts) {
  cljs.core.string_print.call(null, "\n");
  if(cljs.core.truth_(cljs.core._lookup.call(null, opts, "\ufdd0'flush-on-newline", null))) {
    return cljs.core.flush.call(null)
  }else {
    return null
  }
};
cljs.core._STAR_flush_on_newline_STAR_ = true;
cljs.core._STAR_print_readably_STAR_ = true;
cljs.core._STAR_print_meta_STAR_ = false;
cljs.core._STAR_print_dup_STAR_ = false;
cljs.core.pr_opts = function pr_opts() {
  return cljs.core.ObjMap.fromObject(["\ufdd0'flush-on-newline", "\ufdd0'readably", "\ufdd0'meta", "\ufdd0'dup"], {"\ufdd0'flush-on-newline":cljs.core._STAR_flush_on_newline_STAR_, "\ufdd0'readably":cljs.core._STAR_print_readably_STAR_, "\ufdd0'meta":cljs.core._STAR_print_meta_STAR_, "\ufdd0'dup":cljs.core._STAR_print_dup_STAR_})
};
cljs.core.pr_str = function() {
  var pr_str__delegate = function(objs) {
    return cljs.core.pr_str_with_opts.call(null, objs, cljs.core.pr_opts.call(null))
  };
  var pr_str = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return pr_str__delegate.call(this, objs)
  };
  pr_str.cljs$lang$maxFixedArity = 0;
  pr_str.cljs$lang$applyTo = function(arglist__9855) {
    var objs = cljs.core.seq(arglist__9855);
    return pr_str__delegate(objs)
  };
  pr_str.cljs$lang$arity$variadic = pr_str__delegate;
  return pr_str
}();
cljs.core.prn_str = function() {
  var prn_str__delegate = function(objs) {
    return cljs.core.prn_str_with_opts.call(null, objs, cljs.core.pr_opts.call(null))
  };
  var prn_str = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return prn_str__delegate.call(this, objs)
  };
  prn_str.cljs$lang$maxFixedArity = 0;
  prn_str.cljs$lang$applyTo = function(arglist__9856) {
    var objs = cljs.core.seq(arglist__9856);
    return prn_str__delegate(objs)
  };
  prn_str.cljs$lang$arity$variadic = prn_str__delegate;
  return prn_str
}();
cljs.core.pr = function() {
  var pr__delegate = function(objs) {
    return cljs.core.pr_with_opts.call(null, objs, cljs.core.pr_opts.call(null))
  };
  var pr = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return pr__delegate.call(this, objs)
  };
  pr.cljs$lang$maxFixedArity = 0;
  pr.cljs$lang$applyTo = function(arglist__9857) {
    var objs = cljs.core.seq(arglist__9857);
    return pr__delegate(objs)
  };
  pr.cljs$lang$arity$variadic = pr__delegate;
  return pr
}();
cljs.core.print = function() {
  var cljs_core_print__delegate = function(objs) {
    return cljs.core.pr_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), "\ufdd0'readably", false))
  };
  var cljs_core_print = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return cljs_core_print__delegate.call(this, objs)
  };
  cljs_core_print.cljs$lang$maxFixedArity = 0;
  cljs_core_print.cljs$lang$applyTo = function(arglist__9858) {
    var objs = cljs.core.seq(arglist__9858);
    return cljs_core_print__delegate(objs)
  };
  cljs_core_print.cljs$lang$arity$variadic = cljs_core_print__delegate;
  return cljs_core_print
}();
cljs.core.print_str = function() {
  var print_str__delegate = function(objs) {
    return cljs.core.pr_str_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), "\ufdd0'readably", false))
  };
  var print_str = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return print_str__delegate.call(this, objs)
  };
  print_str.cljs$lang$maxFixedArity = 0;
  print_str.cljs$lang$applyTo = function(arglist__9859) {
    var objs = cljs.core.seq(arglist__9859);
    return print_str__delegate(objs)
  };
  print_str.cljs$lang$arity$variadic = print_str__delegate;
  return print_str
}();
cljs.core.println = function() {
  var println__delegate = function(objs) {
    cljs.core.pr_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), "\ufdd0'readably", false));
    return cljs.core.newline.call(null, cljs.core.pr_opts.call(null))
  };
  var println = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return println__delegate.call(this, objs)
  };
  println.cljs$lang$maxFixedArity = 0;
  println.cljs$lang$applyTo = function(arglist__9860) {
    var objs = cljs.core.seq(arglist__9860);
    return println__delegate(objs)
  };
  println.cljs$lang$arity$variadic = println__delegate;
  return println
}();
cljs.core.println_str = function() {
  var println_str__delegate = function(objs) {
    return cljs.core.prn_str_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), "\ufdd0'readably", false))
  };
  var println_str = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return println_str__delegate.call(this, objs)
  };
  println_str.cljs$lang$maxFixedArity = 0;
  println_str.cljs$lang$applyTo = function(arglist__9861) {
    var objs = cljs.core.seq(arglist__9861);
    return println_str__delegate(objs)
  };
  println_str.cljs$lang$arity$variadic = println_str__delegate;
  return println_str
}();
cljs.core.prn = function() {
  var prn__delegate = function(objs) {
    cljs.core.pr_with_opts.call(null, objs, cljs.core.pr_opts.call(null));
    return cljs.core.newline.call(null, cljs.core.pr_opts.call(null))
  };
  var prn = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return prn__delegate.call(this, objs)
  };
  prn.cljs$lang$maxFixedArity = 0;
  prn.cljs$lang$applyTo = function(arglist__9862) {
    var objs = cljs.core.seq(arglist__9862);
    return prn__delegate(objs)
  };
  prn.cljs$lang$arity$variadic = prn__delegate;
  return prn
}();
cljs.core.printf = function() {
  var printf__delegate = function(fmt, args) {
    return cljs.core.print.call(null, cljs.core.apply.call(null, cljs.core.format, fmt, args))
  };
  var printf = function(fmt, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return printf__delegate.call(this, fmt, args)
  };
  printf.cljs$lang$maxFixedArity = 1;
  printf.cljs$lang$applyTo = function(arglist__9863) {
    var fmt = cljs.core.first(arglist__9863);
    var args = cljs.core.rest(arglist__9863);
    return printf__delegate(fmt, args)
  };
  printf.cljs$lang$arity$variadic = printf__delegate;
  return printf
}();
cljs.core.HashMap.prototype.cljs$core$IPrintable$ = true;
cljs.core.HashMap.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  var pr_pair__9864 = function(keyval) {
    return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "", " ", "", opts, keyval)
  };
  return cljs.core.pr_sequential.call(null, pr_pair__9864, "{", ", ", "}", opts, coll)
};
cljs.core.IPrintable["number"] = true;
cljs.core._pr_seq["number"] = function(n, opts) {
  return cljs.core.list.call(null, [cljs.core.str(n)].join(""))
};
cljs.core.IndexedSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.Subvec.prototype.cljs$core$IPrintable$ = true;
cljs.core.Subvec.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "[", " ", "]", opts, coll)
};
cljs.core.ChunkedCons.prototype.cljs$core$IPrintable$ = true;
cljs.core.ChunkedCons.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentTreeMap.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  var pr_pair__9865 = function(keyval) {
    return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "", " ", "", opts, keyval)
  };
  return cljs.core.pr_sequential.call(null, pr_pair__9865, "{", ", ", "}", opts, coll)
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentArrayMap.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  var pr_pair__9866 = function(keyval) {
    return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "", " ", "", opts, keyval)
  };
  return cljs.core.pr_sequential.call(null, pr_pair__9866, "{", ", ", "}", opts, coll)
};
cljs.core.PersistentQueue.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "#queue [", " ", "]", opts, cljs.core.seq.call(null, coll))
};
cljs.core.LazySeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.LazySeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.RSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.RSeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentTreeSet.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "#{", " ", "}", opts, coll)
};
cljs.core.IPrintable["boolean"] = true;
cljs.core._pr_seq["boolean"] = function(bool, opts) {
  return cljs.core.list.call(null, [cljs.core.str(bool)].join(""))
};
cljs.core.IPrintable["string"] = true;
cljs.core._pr_seq["string"] = function(obj, opts) {
  if(cljs.core.keyword_QMARK_.call(null, obj)) {
    return cljs.core.list.call(null, [cljs.core.str(":"), cljs.core.str(function() {
      var temp__3974__auto____9867 = cljs.core.namespace.call(null, obj);
      if(cljs.core.truth_(temp__3974__auto____9867)) {
        var nspc__9868 = temp__3974__auto____9867;
        return[cljs.core.str(nspc__9868), cljs.core.str("/")].join("")
      }else {
        return null
      }
    }()), cljs.core.str(cljs.core.name.call(null, obj))].join(""))
  }else {
    if(cljs.core.symbol_QMARK_.call(null, obj)) {
      return cljs.core.list.call(null, [cljs.core.str(function() {
        var temp__3974__auto____9869 = cljs.core.namespace.call(null, obj);
        if(cljs.core.truth_(temp__3974__auto____9869)) {
          var nspc__9870 = temp__3974__auto____9869;
          return[cljs.core.str(nspc__9870), cljs.core.str("/")].join("")
        }else {
          return null
        }
      }()), cljs.core.str(cljs.core.name.call(null, obj))].join(""))
    }else {
      if("\ufdd0'else") {
        return cljs.core.list.call(null, cljs.core.truth_((new cljs.core.Keyword("\ufdd0'readably")).call(null, opts)) ? goog.string.quote(obj) : obj)
      }else {
        return null
      }
    }
  }
};
cljs.core.NodeSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.NodeSeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.RedNode.prototype.cljs$core$IPrintable$ = true;
cljs.core.RedNode.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "[", " ", "]", opts, coll)
};
cljs.core.ChunkedSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.ChunkedSeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.PersistentHashMap.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentHashMap.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  var pr_pair__9871 = function(keyval) {
    return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "", " ", "", opts, keyval)
  };
  return cljs.core.pr_sequential.call(null, pr_pair__9871, "{", ", ", "}", opts, coll)
};
cljs.core.Vector.prototype.cljs$core$IPrintable$ = true;
cljs.core.Vector.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "[", " ", "]", opts, coll)
};
cljs.core.PersistentHashSet.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentHashSet.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "#{", " ", "}", opts, coll)
};
cljs.core.PersistentVector.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "[", " ", "]", opts, coll)
};
cljs.core.List.prototype.cljs$core$IPrintable$ = true;
cljs.core.List.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.IPrintable["array"] = true;
cljs.core._pr_seq["array"] = function(a, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "#<Array [", ", ", "]>", opts, a)
};
cljs.core.IPrintable["function"] = true;
cljs.core._pr_seq["function"] = function(this$) {
  return cljs.core.list.call(null, "#<", [cljs.core.str(this$)].join(""), ">")
};
cljs.core.EmptyList.prototype.cljs$core$IPrintable$ = true;
cljs.core.EmptyList.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.list.call(null, "()")
};
cljs.core.BlackNode.prototype.cljs$core$IPrintable$ = true;
cljs.core.BlackNode.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "[", " ", "]", opts, coll)
};
Date.prototype.cljs$core$IPrintable$ = true;
Date.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(d, _) {
  var normalize__9873 = function(n, len) {
    var ns__9872 = [cljs.core.str(n)].join("");
    while(true) {
      if(cljs.core.count.call(null, ns__9872) < len) {
        var G__9875 = [cljs.core.str("0"), cljs.core.str(ns__9872)].join("");
        ns__9872 = G__9875;
        continue
      }else {
        return ns__9872
      }
      break
    }
  };
  return cljs.core.list.call(null, [cljs.core.str('#inst "'), cljs.core.str(d.getUTCFullYear()), cljs.core.str("-"), cljs.core.str(normalize__9873.call(null, d.getUTCMonth() + 1, 2)), cljs.core.str("-"), cljs.core.str(normalize__9873.call(null, d.getUTCDate(), 2)), cljs.core.str("T"), cljs.core.str(normalize__9873.call(null, d.getUTCHours(), 2)), cljs.core.str(":"), cljs.core.str(normalize__9873.call(null, d.getUTCMinutes(), 2)), cljs.core.str(":"), cljs.core.str(normalize__9873.call(null, d.getUTCSeconds(), 
  2)), cljs.core.str("."), cljs.core.str(normalize__9873.call(null, d.getUTCMilliseconds(), 3)), cljs.core.str("-"), cljs.core.str('00:00"')].join(""))
};
cljs.core.Cons.prototype.cljs$core$IPrintable$ = true;
cljs.core.Cons.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.Range.prototype.cljs$core$IPrintable$ = true;
cljs.core.Range.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.ArrayNodeSeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.ObjMap.prototype.cljs$core$IPrintable$ = true;
cljs.core.ObjMap.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  var pr_pair__9874 = function(keyval) {
    return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "", " ", "", opts, keyval)
  };
  return cljs.core.pr_sequential.call(null, pr_pair__9874, "{", ", ", "}", opts, coll)
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.PersistentVector.prototype.cljs$core$IComparable$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IComparable$_compare$arity$2 = function(x, y) {
  return cljs.core.compare_indexed.call(null, x, y)
};
cljs.core.Atom = function(state, meta, validator, watches) {
  this.state = state;
  this.meta = meta;
  this.validator = validator;
  this.watches = watches;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 2690809856
};
cljs.core.Atom.cljs$lang$type = true;
cljs.core.Atom.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/Atom")
};
cljs.core.Atom.prototype.cljs$core$IHash$_hash$arity$1 = function(this$) {
  var this__9876 = this;
  return goog.getUid(this$)
};
cljs.core.Atom.prototype.cljs$core$IWatchable$_notify_watches$arity$3 = function(this$, oldval, newval) {
  var this__9877 = this;
  var G__9878__9879 = cljs.core.seq.call(null, this__9877.watches);
  if(G__9878__9879) {
    var G__9881__9883 = cljs.core.first.call(null, G__9878__9879);
    var vec__9882__9884 = G__9881__9883;
    var key__9885 = cljs.core.nth.call(null, vec__9882__9884, 0, null);
    var f__9886 = cljs.core.nth.call(null, vec__9882__9884, 1, null);
    var G__9878__9887 = G__9878__9879;
    var G__9881__9888 = G__9881__9883;
    var G__9878__9889 = G__9878__9887;
    while(true) {
      var vec__9890__9891 = G__9881__9888;
      var key__9892 = cljs.core.nth.call(null, vec__9890__9891, 0, null);
      var f__9893 = cljs.core.nth.call(null, vec__9890__9891, 1, null);
      var G__9878__9894 = G__9878__9889;
      f__9893.call(null, key__9892, this$, oldval, newval);
      var temp__3974__auto____9895 = cljs.core.next.call(null, G__9878__9894);
      if(temp__3974__auto____9895) {
        var G__9878__9896 = temp__3974__auto____9895;
        var G__9903 = cljs.core.first.call(null, G__9878__9896);
        var G__9904 = G__9878__9896;
        G__9881__9888 = G__9903;
        G__9878__9889 = G__9904;
        continue
      }else {
        return null
      }
      break
    }
  }else {
    return null
  }
};
cljs.core.Atom.prototype.cljs$core$IWatchable$_add_watch$arity$3 = function(this$, key, f) {
  var this__9897 = this;
  return this$.watches = cljs.core.assoc.call(null, this__9897.watches, key, f)
};
cljs.core.Atom.prototype.cljs$core$IWatchable$_remove_watch$arity$2 = function(this$, key) {
  var this__9898 = this;
  return this$.watches = cljs.core.dissoc.call(null, this__9898.watches, key)
};
cljs.core.Atom.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(a, opts) {
  var this__9899 = this;
  return cljs.core.concat.call(null, cljs.core.PersistentVector.fromArray(["#<Atom: "], true), cljs.core._pr_seq.call(null, this__9899.state, opts), ">")
};
cljs.core.Atom.prototype.cljs$core$IMeta$_meta$arity$1 = function(_) {
  var this__9900 = this;
  return this__9900.meta
};
cljs.core.Atom.prototype.cljs$core$IDeref$_deref$arity$1 = function(_) {
  var this__9901 = this;
  return this__9901.state
};
cljs.core.Atom.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(o, other) {
  var this__9902 = this;
  return o === other
};
cljs.core.Atom;
cljs.core.atom = function() {
  var atom = null;
  var atom__1 = function(x) {
    return new cljs.core.Atom(x, null, null, null)
  };
  var atom__2 = function() {
    var G__9916__delegate = function(x, p__9905) {
      var map__9911__9912 = p__9905;
      var map__9911__9913 = cljs.core.seq_QMARK_.call(null, map__9911__9912) ? cljs.core.apply.call(null, cljs.core.hash_map, map__9911__9912) : map__9911__9912;
      var validator__9914 = cljs.core._lookup.call(null, map__9911__9913, "\ufdd0'validator", null);
      var meta__9915 = cljs.core._lookup.call(null, map__9911__9913, "\ufdd0'meta", null);
      return new cljs.core.Atom(x, meta__9915, validator__9914, null)
    };
    var G__9916 = function(x, var_args) {
      var p__9905 = null;
      if(goog.isDef(var_args)) {
        p__9905 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
      }
      return G__9916__delegate.call(this, x, p__9905)
    };
    G__9916.cljs$lang$maxFixedArity = 1;
    G__9916.cljs$lang$applyTo = function(arglist__9917) {
      var x = cljs.core.first(arglist__9917);
      var p__9905 = cljs.core.rest(arglist__9917);
      return G__9916__delegate(x, p__9905)
    };
    G__9916.cljs$lang$arity$variadic = G__9916__delegate;
    return G__9916
  }();
  atom = function(x, var_args) {
    var p__9905 = var_args;
    switch(arguments.length) {
      case 1:
        return atom__1.call(this, x);
      default:
        return atom__2.cljs$lang$arity$variadic(x, cljs.core.array_seq(arguments, 1))
    }
    throw"Invalid arity: " + arguments.length;
  };
  atom.cljs$lang$maxFixedArity = 1;
  atom.cljs$lang$applyTo = atom__2.cljs$lang$applyTo;
  atom.cljs$lang$arity$1 = atom__1;
  atom.cljs$lang$arity$variadic = atom__2.cljs$lang$arity$variadic;
  return atom
}();
cljs.core.reset_BANG_ = function reset_BANG_(a, new_value) {
  var temp__3974__auto____9921 = a.validator;
  if(cljs.core.truth_(temp__3974__auto____9921)) {
    var validate__9922 = temp__3974__auto____9921;
    if(cljs.core.truth_(validate__9922.call(null, new_value))) {
    }else {
      throw new Error([cljs.core.str("Assert failed: "), cljs.core.str("Validator rejected reference state"), cljs.core.str("\n"), cljs.core.str(cljs.core.pr_str.call(null, cljs.core.with_meta(cljs.core.list("\ufdd1'validate", "\ufdd1'new-value"), cljs.core.hash_map("\ufdd0'line", 6440))))].join(""));
    }
  }else {
  }
  var old_value__9923 = a.state;
  a.state = new_value;
  cljs.core._notify_watches.call(null, a, old_value__9923, new_value);
  return new_value
};
cljs.core.swap_BANG_ = function() {
  var swap_BANG_ = null;
  var swap_BANG___2 = function(a, f) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state))
  };
  var swap_BANG___3 = function(a, f, x) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state, x))
  };
  var swap_BANG___4 = function(a, f, x, y) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state, x, y))
  };
  var swap_BANG___5 = function(a, f, x, y, z) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state, x, y, z))
  };
  var swap_BANG___6 = function() {
    var G__9924__delegate = function(a, f, x, y, z, more) {
      return cljs.core.reset_BANG_.call(null, a, cljs.core.apply.call(null, f, a.state, x, y, z, more))
    };
    var G__9924 = function(a, f, x, y, z, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 5), 0)
      }
      return G__9924__delegate.call(this, a, f, x, y, z, more)
    };
    G__9924.cljs$lang$maxFixedArity = 5;
    G__9924.cljs$lang$applyTo = function(arglist__9925) {
      var a = cljs.core.first(arglist__9925);
      var f = cljs.core.first(cljs.core.next(arglist__9925));
      var x = cljs.core.first(cljs.core.next(cljs.core.next(arglist__9925)));
      var y = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__9925))));
      var z = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__9925)))));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__9925)))));
      return G__9924__delegate(a, f, x, y, z, more)
    };
    G__9924.cljs$lang$arity$variadic = G__9924__delegate;
    return G__9924
  }();
  swap_BANG_ = function(a, f, x, y, z, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return swap_BANG___2.call(this, a, f);
      case 3:
        return swap_BANG___3.call(this, a, f, x);
      case 4:
        return swap_BANG___4.call(this, a, f, x, y);
      case 5:
        return swap_BANG___5.call(this, a, f, x, y, z);
      default:
        return swap_BANG___6.cljs$lang$arity$variadic(a, f, x, y, z, cljs.core.array_seq(arguments, 5))
    }
    throw"Invalid arity: " + arguments.length;
  };
  swap_BANG_.cljs$lang$maxFixedArity = 5;
  swap_BANG_.cljs$lang$applyTo = swap_BANG___6.cljs$lang$applyTo;
  swap_BANG_.cljs$lang$arity$2 = swap_BANG___2;
  swap_BANG_.cljs$lang$arity$3 = swap_BANG___3;
  swap_BANG_.cljs$lang$arity$4 = swap_BANG___4;
  swap_BANG_.cljs$lang$arity$5 = swap_BANG___5;
  swap_BANG_.cljs$lang$arity$variadic = swap_BANG___6.cljs$lang$arity$variadic;
  return swap_BANG_
}();
cljs.core.compare_and_set_BANG_ = function compare_and_set_BANG_(a, oldval, newval) {
  if(cljs.core._EQ_.call(null, a.state, oldval)) {
    cljs.core.reset_BANG_.call(null, a, newval);
    return true
  }else {
    return false
  }
};
cljs.core.deref = function deref(o) {
  return cljs.core._deref.call(null, o)
};
cljs.core.set_validator_BANG_ = function set_validator_BANG_(iref, val) {
  return iref.validator = val
};
cljs.core.get_validator = function get_validator(iref) {
  return iref.validator
};
cljs.core.alter_meta_BANG_ = function() {
  var alter_meta_BANG___delegate = function(iref, f, args) {
    return iref.meta = cljs.core.apply.call(null, f, iref.meta, args)
  };
  var alter_meta_BANG_ = function(iref, f, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
    }
    return alter_meta_BANG___delegate.call(this, iref, f, args)
  };
  alter_meta_BANG_.cljs$lang$maxFixedArity = 2;
  alter_meta_BANG_.cljs$lang$applyTo = function(arglist__9926) {
    var iref = cljs.core.first(arglist__9926);
    var f = cljs.core.first(cljs.core.next(arglist__9926));
    var args = cljs.core.rest(cljs.core.next(arglist__9926));
    return alter_meta_BANG___delegate(iref, f, args)
  };
  alter_meta_BANG_.cljs$lang$arity$variadic = alter_meta_BANG___delegate;
  return alter_meta_BANG_
}();
cljs.core.reset_meta_BANG_ = function reset_meta_BANG_(iref, m) {
  return iref.meta = m
};
cljs.core.add_watch = function add_watch(iref, key, f) {
  return cljs.core._add_watch.call(null, iref, key, f)
};
cljs.core.remove_watch = function remove_watch(iref, key) {
  return cljs.core._remove_watch.call(null, iref, key)
};
cljs.core.gensym_counter = null;
cljs.core.gensym = function() {
  var gensym = null;
  var gensym__0 = function() {
    return gensym.call(null, "G__")
  };
  var gensym__1 = function(prefix_string) {
    if(cljs.core.gensym_counter == null) {
      cljs.core.gensym_counter = cljs.core.atom.call(null, 0)
    }else {
    }
    return cljs.core.symbol.call(null, [cljs.core.str(prefix_string), cljs.core.str(cljs.core.swap_BANG_.call(null, cljs.core.gensym_counter, cljs.core.inc))].join(""))
  };
  gensym = function(prefix_string) {
    switch(arguments.length) {
      case 0:
        return gensym__0.call(this);
      case 1:
        return gensym__1.call(this, prefix_string)
    }
    throw"Invalid arity: " + arguments.length;
  };
  gensym.cljs$lang$arity$0 = gensym__0;
  gensym.cljs$lang$arity$1 = gensym__1;
  return gensym
}();
cljs.core.fixture1 = 1;
cljs.core.fixture2 = 2;
cljs.core.Delay = function(state, f) {
  this.state = state;
  this.f = f;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 1073774592
};
cljs.core.Delay.cljs$lang$type = true;
cljs.core.Delay.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/Delay")
};
cljs.core.Delay.prototype.cljs$core$IPending$_realized_QMARK_$arity$1 = function(d) {
  var this__9927 = this;
  return(new cljs.core.Keyword("\ufdd0'done")).call(null, cljs.core.deref.call(null, this__9927.state))
};
cljs.core.Delay.prototype.cljs$core$IDeref$_deref$arity$1 = function(_) {
  var this__9928 = this;
  return(new cljs.core.Keyword("\ufdd0'value")).call(null, cljs.core.swap_BANG_.call(null, this__9928.state, function(p__9929) {
    var map__9930__9931 = p__9929;
    var map__9930__9932 = cljs.core.seq_QMARK_.call(null, map__9930__9931) ? cljs.core.apply.call(null, cljs.core.hash_map, map__9930__9931) : map__9930__9931;
    var curr_state__9933 = map__9930__9932;
    var done__9934 = cljs.core._lookup.call(null, map__9930__9932, "\ufdd0'done", null);
    if(cljs.core.truth_(done__9934)) {
      return curr_state__9933
    }else {
      return cljs.core.ObjMap.fromObject(["\ufdd0'done", "\ufdd0'value"], {"\ufdd0'done":true, "\ufdd0'value":this__9928.f.call(null)})
    }
  }))
};
cljs.core.Delay;
cljs.core.delay_QMARK_ = function delay_QMARK_(x) {
  return cljs.core.instance_QMARK_.call(null, cljs.core.Delay, x)
};
cljs.core.force = function force(x) {
  if(cljs.core.delay_QMARK_.call(null, x)) {
    return cljs.core.deref.call(null, x)
  }else {
    return x
  }
};
cljs.core.realized_QMARK_ = function realized_QMARK_(d) {
  return cljs.core._realized_QMARK_.call(null, d)
};
cljs.core.js__GT_clj = function() {
  var js__GT_clj__delegate = function(x, options) {
    var map__9955__9956 = options;
    var map__9955__9957 = cljs.core.seq_QMARK_.call(null, map__9955__9956) ? cljs.core.apply.call(null, cljs.core.hash_map, map__9955__9956) : map__9955__9956;
    var keywordize_keys__9958 = cljs.core._lookup.call(null, map__9955__9957, "\ufdd0'keywordize-keys", null);
    var keyfn__9959 = cljs.core.truth_(keywordize_keys__9958) ? cljs.core.keyword : cljs.core.str;
    var f__9974 = function thisfn(x) {
      if(cljs.core.seq_QMARK_.call(null, x)) {
        return cljs.core.doall.call(null, cljs.core.map.call(null, thisfn, x))
      }else {
        if(cljs.core.coll_QMARK_.call(null, x)) {
          return cljs.core.into.call(null, cljs.core.empty.call(null, x), cljs.core.map.call(null, thisfn, x))
        }else {
          if(cljs.core.truth_(goog.isArray(x))) {
            return cljs.core.vec.call(null, cljs.core.map.call(null, thisfn, x))
          }else {
            if(cljs.core.type.call(null, x) === Object) {
              return cljs.core.into.call(null, cljs.core.ObjMap.EMPTY, function() {
                var iter__2462__auto____9973 = function iter__9967(s__9968) {
                  return new cljs.core.LazySeq(null, false, function() {
                    var s__9968__9971 = s__9968;
                    while(true) {
                      if(cljs.core.seq.call(null, s__9968__9971)) {
                        var k__9972 = cljs.core.first.call(null, s__9968__9971);
                        return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([keyfn__9959.call(null, k__9972), thisfn.call(null, x[k__9972])], true), iter__9967.call(null, cljs.core.rest.call(null, s__9968__9971)))
                      }else {
                        return null
                      }
                      break
                    }
                  }, null)
                };
                return iter__2462__auto____9973.call(null, cljs.core.js_keys.call(null, x))
              }())
            }else {
              if("\ufdd0'else") {
                return x
              }else {
                return null
              }
            }
          }
        }
      }
    };
    return f__9974.call(null, x)
  };
  var js__GT_clj = function(x, var_args) {
    var options = null;
    if(goog.isDef(var_args)) {
      options = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return js__GT_clj__delegate.call(this, x, options)
  };
  js__GT_clj.cljs$lang$maxFixedArity = 1;
  js__GT_clj.cljs$lang$applyTo = function(arglist__9975) {
    var x = cljs.core.first(arglist__9975);
    var options = cljs.core.rest(arglist__9975);
    return js__GT_clj__delegate(x, options)
  };
  js__GT_clj.cljs$lang$arity$variadic = js__GT_clj__delegate;
  return js__GT_clj
}();
cljs.core.memoize = function memoize(f) {
  var mem__9980 = cljs.core.atom.call(null, cljs.core.ObjMap.EMPTY);
  return function() {
    var G__9984__delegate = function(args) {
      var temp__3971__auto____9981 = cljs.core._lookup.call(null, cljs.core.deref.call(null, mem__9980), args, null);
      if(cljs.core.truth_(temp__3971__auto____9981)) {
        var v__9982 = temp__3971__auto____9981;
        return v__9982
      }else {
        var ret__9983 = cljs.core.apply.call(null, f, args);
        cljs.core.swap_BANG_.call(null, mem__9980, cljs.core.assoc, args, ret__9983);
        return ret__9983
      }
    };
    var G__9984 = function(var_args) {
      var args = null;
      if(goog.isDef(var_args)) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
      }
      return G__9984__delegate.call(this, args)
    };
    G__9984.cljs$lang$maxFixedArity = 0;
    G__9984.cljs$lang$applyTo = function(arglist__9985) {
      var args = cljs.core.seq(arglist__9985);
      return G__9984__delegate(args)
    };
    G__9984.cljs$lang$arity$variadic = G__9984__delegate;
    return G__9984
  }()
};
cljs.core.trampoline = function() {
  var trampoline = null;
  var trampoline__1 = function(f) {
    while(true) {
      var ret__9987 = f.call(null);
      if(cljs.core.fn_QMARK_.call(null, ret__9987)) {
        var G__9988 = ret__9987;
        f = G__9988;
        continue
      }else {
        return ret__9987
      }
      break
    }
  };
  var trampoline__2 = function() {
    var G__9989__delegate = function(f, args) {
      return trampoline.call(null, function() {
        return cljs.core.apply.call(null, f, args)
      })
    };
    var G__9989 = function(f, var_args) {
      var args = null;
      if(goog.isDef(var_args)) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
      }
      return G__9989__delegate.call(this, f, args)
    };
    G__9989.cljs$lang$maxFixedArity = 1;
    G__9989.cljs$lang$applyTo = function(arglist__9990) {
      var f = cljs.core.first(arglist__9990);
      var args = cljs.core.rest(arglist__9990);
      return G__9989__delegate(f, args)
    };
    G__9989.cljs$lang$arity$variadic = G__9989__delegate;
    return G__9989
  }();
  trampoline = function(f, var_args) {
    var args = var_args;
    switch(arguments.length) {
      case 1:
        return trampoline__1.call(this, f);
      default:
        return trampoline__2.cljs$lang$arity$variadic(f, cljs.core.array_seq(arguments, 1))
    }
    throw"Invalid arity: " + arguments.length;
  };
  trampoline.cljs$lang$maxFixedArity = 1;
  trampoline.cljs$lang$applyTo = trampoline__2.cljs$lang$applyTo;
  trampoline.cljs$lang$arity$1 = trampoline__1;
  trampoline.cljs$lang$arity$variadic = trampoline__2.cljs$lang$arity$variadic;
  return trampoline
}();
cljs.core.rand = function() {
  var rand = null;
  var rand__0 = function() {
    return rand.call(null, 1)
  };
  var rand__1 = function(n) {
    return Math.random.call(null) * n
  };
  rand = function(n) {
    switch(arguments.length) {
      case 0:
        return rand__0.call(this);
      case 1:
        return rand__1.call(this, n)
    }
    throw"Invalid arity: " + arguments.length;
  };
  rand.cljs$lang$arity$0 = rand__0;
  rand.cljs$lang$arity$1 = rand__1;
  return rand
}();
cljs.core.rand_int = function rand_int(n) {
  return Math.floor.call(null, Math.random.call(null) * n)
};
cljs.core.rand_nth = function rand_nth(coll) {
  return cljs.core.nth.call(null, coll, cljs.core.rand_int.call(null, cljs.core.count.call(null, coll)))
};
cljs.core.group_by = function group_by(f, coll) {
  return cljs.core.reduce.call(null, function(ret, x) {
    var k__9992 = f.call(null, x);
    return cljs.core.assoc.call(null, ret, k__9992, cljs.core.conj.call(null, cljs.core._lookup.call(null, ret, k__9992, cljs.core.PersistentVector.EMPTY), x))
  }, cljs.core.ObjMap.EMPTY, coll)
};
cljs.core.make_hierarchy = function make_hierarchy() {
  return cljs.core.ObjMap.fromObject(["\ufdd0'parents", "\ufdd0'descendants", "\ufdd0'ancestors"], {"\ufdd0'parents":cljs.core.ObjMap.EMPTY, "\ufdd0'descendants":cljs.core.ObjMap.EMPTY, "\ufdd0'ancestors":cljs.core.ObjMap.EMPTY})
};
cljs.core.global_hierarchy = cljs.core.atom.call(null, cljs.core.make_hierarchy.call(null));
cljs.core.isa_QMARK_ = function() {
  var isa_QMARK_ = null;
  var isa_QMARK___2 = function(child, parent) {
    return isa_QMARK_.call(null, cljs.core.deref.call(null, cljs.core.global_hierarchy), child, parent)
  };
  var isa_QMARK___3 = function(h, child, parent) {
    var or__3824__auto____10001 = cljs.core._EQ_.call(null, child, parent);
    if(or__3824__auto____10001) {
      return or__3824__auto____10001
    }else {
      var or__3824__auto____10002 = cljs.core.contains_QMARK_.call(null, (new cljs.core.Keyword("\ufdd0'ancestors")).call(null, h).call(null, child), parent);
      if(or__3824__auto____10002) {
        return or__3824__auto____10002
      }else {
        var and__3822__auto____10003 = cljs.core.vector_QMARK_.call(null, parent);
        if(and__3822__auto____10003) {
          var and__3822__auto____10004 = cljs.core.vector_QMARK_.call(null, child);
          if(and__3822__auto____10004) {
            var and__3822__auto____10005 = cljs.core.count.call(null, parent) === cljs.core.count.call(null, child);
            if(and__3822__auto____10005) {
              var ret__10006 = true;
              var i__10007 = 0;
              while(true) {
                if(function() {
                  var or__3824__auto____10008 = cljs.core.not.call(null, ret__10006);
                  if(or__3824__auto____10008) {
                    return or__3824__auto____10008
                  }else {
                    return i__10007 === cljs.core.count.call(null, parent)
                  }
                }()) {
                  return ret__10006
                }else {
                  var G__10009 = isa_QMARK_.call(null, h, child.call(null, i__10007), parent.call(null, i__10007));
                  var G__10010 = i__10007 + 1;
                  ret__10006 = G__10009;
                  i__10007 = G__10010;
                  continue
                }
                break
              }
            }else {
              return and__3822__auto____10005
            }
          }else {
            return and__3822__auto____10004
          }
        }else {
          return and__3822__auto____10003
        }
      }
    }
  };
  isa_QMARK_ = function(h, child, parent) {
    switch(arguments.length) {
      case 2:
        return isa_QMARK___2.call(this, h, child);
      case 3:
        return isa_QMARK___3.call(this, h, child, parent)
    }
    throw"Invalid arity: " + arguments.length;
  };
  isa_QMARK_.cljs$lang$arity$2 = isa_QMARK___2;
  isa_QMARK_.cljs$lang$arity$3 = isa_QMARK___3;
  return isa_QMARK_
}();
cljs.core.parents = function() {
  var parents = null;
  var parents__1 = function(tag) {
    return parents.call(null, cljs.core.deref.call(null, cljs.core.global_hierarchy), tag)
  };
  var parents__2 = function(h, tag) {
    return cljs.core.not_empty.call(null, cljs.core._lookup.call(null, (new cljs.core.Keyword("\ufdd0'parents")).call(null, h), tag, null))
  };
  parents = function(h, tag) {
    switch(arguments.length) {
      case 1:
        return parents__1.call(this, h);
      case 2:
        return parents__2.call(this, h, tag)
    }
    throw"Invalid arity: " + arguments.length;
  };
  parents.cljs$lang$arity$1 = parents__1;
  parents.cljs$lang$arity$2 = parents__2;
  return parents
}();
cljs.core.ancestors = function() {
  var ancestors = null;
  var ancestors__1 = function(tag) {
    return ancestors.call(null, cljs.core.deref.call(null, cljs.core.global_hierarchy), tag)
  };
  var ancestors__2 = function(h, tag) {
    return cljs.core.not_empty.call(null, cljs.core._lookup.call(null, (new cljs.core.Keyword("\ufdd0'ancestors")).call(null, h), tag, null))
  };
  ancestors = function(h, tag) {
    switch(arguments.length) {
      case 1:
        return ancestors__1.call(this, h);
      case 2:
        return ancestors__2.call(this, h, tag)
    }
    throw"Invalid arity: " + arguments.length;
  };
  ancestors.cljs$lang$arity$1 = ancestors__1;
  ancestors.cljs$lang$arity$2 = ancestors__2;
  return ancestors
}();
cljs.core.descendants = function() {
  var descendants = null;
  var descendants__1 = function(tag) {
    return descendants.call(null, cljs.core.deref.call(null, cljs.core.global_hierarchy), tag)
  };
  var descendants__2 = function(h, tag) {
    return cljs.core.not_empty.call(null, cljs.core._lookup.call(null, (new cljs.core.Keyword("\ufdd0'descendants")).call(null, h), tag, null))
  };
  descendants = function(h, tag) {
    switch(arguments.length) {
      case 1:
        return descendants__1.call(this, h);
      case 2:
        return descendants__2.call(this, h, tag)
    }
    throw"Invalid arity: " + arguments.length;
  };
  descendants.cljs$lang$arity$1 = descendants__1;
  descendants.cljs$lang$arity$2 = descendants__2;
  return descendants
}();
cljs.core.derive = function() {
  var derive = null;
  var derive__2 = function(tag, parent) {
    if(cljs.core.truth_(cljs.core.namespace.call(null, parent))) {
    }else {
      throw new Error([cljs.core.str("Assert failed: "), cljs.core.str(cljs.core.pr_str.call(null, cljs.core.with_meta(cljs.core.list("\ufdd1'namespace", "\ufdd1'parent"), cljs.core.hash_map("\ufdd0'line", 6724))))].join(""));
    }
    cljs.core.swap_BANG_.call(null, cljs.core.global_hierarchy, derive, tag, parent);
    return null
  };
  var derive__3 = function(h, tag, parent) {
    if(cljs.core.not_EQ_.call(null, tag, parent)) {
    }else {
      throw new Error([cljs.core.str("Assert failed: "), cljs.core.str(cljs.core.pr_str.call(null, cljs.core.with_meta(cljs.core.list("\ufdd1'not=", "\ufdd1'tag", "\ufdd1'parent"), cljs.core.hash_map("\ufdd0'line", 6728))))].join(""));
    }
    var tp__10019 = (new cljs.core.Keyword("\ufdd0'parents")).call(null, h);
    var td__10020 = (new cljs.core.Keyword("\ufdd0'descendants")).call(null, h);
    var ta__10021 = (new cljs.core.Keyword("\ufdd0'ancestors")).call(null, h);
    var tf__10022 = function(m, source, sources, target, targets) {
      return cljs.core.reduce.call(null, function(ret, k) {
        return cljs.core.assoc.call(null, ret, k, cljs.core.reduce.call(null, cljs.core.conj, cljs.core._lookup.call(null, targets, k, cljs.core.PersistentHashSet.EMPTY), cljs.core.cons.call(null, target, targets.call(null, target))))
      }, m, cljs.core.cons.call(null, source, sources.call(null, source)))
    };
    var or__3824__auto____10023 = cljs.core.contains_QMARK_.call(null, tp__10019.call(null, tag), parent) ? null : function() {
      if(cljs.core.contains_QMARK_.call(null, ta__10021.call(null, tag), parent)) {
        throw new Error([cljs.core.str(tag), cljs.core.str("already has"), cljs.core.str(parent), cljs.core.str("as ancestor")].join(""));
      }else {
      }
      if(cljs.core.contains_QMARK_.call(null, ta__10021.call(null, parent), tag)) {
        throw new Error([cljs.core.str("Cyclic derivation:"), cljs.core.str(parent), cljs.core.str("has"), cljs.core.str(tag), cljs.core.str("as ancestor")].join(""));
      }else {
      }
      return cljs.core.ObjMap.fromObject(["\ufdd0'parents", "\ufdd0'ancestors", "\ufdd0'descendants"], {"\ufdd0'parents":cljs.core.assoc.call(null, (new cljs.core.Keyword("\ufdd0'parents")).call(null, h), tag, cljs.core.conj.call(null, cljs.core._lookup.call(null, tp__10019, tag, cljs.core.PersistentHashSet.EMPTY), parent)), "\ufdd0'ancestors":tf__10022.call(null, (new cljs.core.Keyword("\ufdd0'ancestors")).call(null, h), tag, td__10020, parent, ta__10021), "\ufdd0'descendants":tf__10022.call(null, 
      (new cljs.core.Keyword("\ufdd0'descendants")).call(null, h), parent, ta__10021, tag, td__10020)})
    }();
    if(cljs.core.truth_(or__3824__auto____10023)) {
      return or__3824__auto____10023
    }else {
      return h
    }
  };
  derive = function(h, tag, parent) {
    switch(arguments.length) {
      case 2:
        return derive__2.call(this, h, tag);
      case 3:
        return derive__3.call(this, h, tag, parent)
    }
    throw"Invalid arity: " + arguments.length;
  };
  derive.cljs$lang$arity$2 = derive__2;
  derive.cljs$lang$arity$3 = derive__3;
  return derive
}();
cljs.core.underive = function() {
  var underive = null;
  var underive__2 = function(tag, parent) {
    cljs.core.swap_BANG_.call(null, cljs.core.global_hierarchy, underive, tag, parent);
    return null
  };
  var underive__3 = function(h, tag, parent) {
    var parentMap__10028 = (new cljs.core.Keyword("\ufdd0'parents")).call(null, h);
    var childsParents__10029 = cljs.core.truth_(parentMap__10028.call(null, tag)) ? cljs.core.disj.call(null, parentMap__10028.call(null, tag), parent) : cljs.core.PersistentHashSet.EMPTY;
    var newParents__10030 = cljs.core.truth_(cljs.core.not_empty.call(null, childsParents__10029)) ? cljs.core.assoc.call(null, parentMap__10028, tag, childsParents__10029) : cljs.core.dissoc.call(null, parentMap__10028, tag);
    var deriv_seq__10031 = cljs.core.flatten.call(null, cljs.core.map.call(null, function(p1__10011_SHARP_) {
      return cljs.core.cons.call(null, cljs.core.first.call(null, p1__10011_SHARP_), cljs.core.interpose.call(null, cljs.core.first.call(null, p1__10011_SHARP_), cljs.core.second.call(null, p1__10011_SHARP_)))
    }, cljs.core.seq.call(null, newParents__10030)));
    if(cljs.core.contains_QMARK_.call(null, parentMap__10028.call(null, tag), parent)) {
      return cljs.core.reduce.call(null, function(p1__10012_SHARP_, p2__10013_SHARP_) {
        return cljs.core.apply.call(null, cljs.core.derive, p1__10012_SHARP_, p2__10013_SHARP_)
      }, cljs.core.make_hierarchy.call(null), cljs.core.partition.call(null, 2, deriv_seq__10031))
    }else {
      return h
    }
  };
  underive = function(h, tag, parent) {
    switch(arguments.length) {
      case 2:
        return underive__2.call(this, h, tag);
      case 3:
        return underive__3.call(this, h, tag, parent)
    }
    throw"Invalid arity: " + arguments.length;
  };
  underive.cljs$lang$arity$2 = underive__2;
  underive.cljs$lang$arity$3 = underive__3;
  return underive
}();
cljs.core.reset_cache = function reset_cache(method_cache, method_table, cached_hierarchy, hierarchy) {
  cljs.core.swap_BANG_.call(null, method_cache, function(_) {
    return cljs.core.deref.call(null, method_table)
  });
  return cljs.core.swap_BANG_.call(null, cached_hierarchy, function(_) {
    return cljs.core.deref.call(null, hierarchy)
  })
};
cljs.core.prefers_STAR_ = function prefers_STAR_(x, y, prefer_table) {
  var xprefs__10039 = cljs.core.deref.call(null, prefer_table).call(null, x);
  var or__3824__auto____10041 = cljs.core.truth_(function() {
    var and__3822__auto____10040 = xprefs__10039;
    if(cljs.core.truth_(and__3822__auto____10040)) {
      return xprefs__10039.call(null, y)
    }else {
      return and__3822__auto____10040
    }
  }()) ? true : null;
  if(cljs.core.truth_(or__3824__auto____10041)) {
    return or__3824__auto____10041
  }else {
    var or__3824__auto____10043 = function() {
      var ps__10042 = cljs.core.parents.call(null, y);
      while(true) {
        if(cljs.core.count.call(null, ps__10042) > 0) {
          if(cljs.core.truth_(prefers_STAR_.call(null, x, cljs.core.first.call(null, ps__10042), prefer_table))) {
          }else {
          }
          var G__10046 = cljs.core.rest.call(null, ps__10042);
          ps__10042 = G__10046;
          continue
        }else {
          return null
        }
        break
      }
    }();
    if(cljs.core.truth_(or__3824__auto____10043)) {
      return or__3824__auto____10043
    }else {
      var or__3824__auto____10045 = function() {
        var ps__10044 = cljs.core.parents.call(null, x);
        while(true) {
          if(cljs.core.count.call(null, ps__10044) > 0) {
            if(cljs.core.truth_(prefers_STAR_.call(null, cljs.core.first.call(null, ps__10044), y, prefer_table))) {
            }else {
            }
            var G__10047 = cljs.core.rest.call(null, ps__10044);
            ps__10044 = G__10047;
            continue
          }else {
            return null
          }
          break
        }
      }();
      if(cljs.core.truth_(or__3824__auto____10045)) {
        return or__3824__auto____10045
      }else {
        return false
      }
    }
  }
};
cljs.core.dominates = function dominates(x, y, prefer_table) {
  var or__3824__auto____10049 = cljs.core.prefers_STAR_.call(null, x, y, prefer_table);
  if(cljs.core.truth_(or__3824__auto____10049)) {
    return or__3824__auto____10049
  }else {
    return cljs.core.isa_QMARK_.call(null, x, y)
  }
};
cljs.core.find_and_cache_best_method = function find_and_cache_best_method(name, dispatch_val, hierarchy, method_table, prefer_table, method_cache, cached_hierarchy) {
  var best_entry__10067 = cljs.core.reduce.call(null, function(be, p__10059) {
    var vec__10060__10061 = p__10059;
    var k__10062 = cljs.core.nth.call(null, vec__10060__10061, 0, null);
    var ___10063 = cljs.core.nth.call(null, vec__10060__10061, 1, null);
    var e__10064 = vec__10060__10061;
    if(cljs.core.isa_QMARK_.call(null, dispatch_val, k__10062)) {
      var be2__10066 = cljs.core.truth_(function() {
        var or__3824__auto____10065 = be == null;
        if(or__3824__auto____10065) {
          return or__3824__auto____10065
        }else {
          return cljs.core.dominates.call(null, k__10062, cljs.core.first.call(null, be), prefer_table)
        }
      }()) ? e__10064 : be;
      if(cljs.core.truth_(cljs.core.dominates.call(null, cljs.core.first.call(null, be2__10066), k__10062, prefer_table))) {
      }else {
        throw new Error([cljs.core.str("Multiple methods in multimethod '"), cljs.core.str(name), cljs.core.str("' match dispatch value: "), cljs.core.str(dispatch_val), cljs.core.str(" -> "), cljs.core.str(k__10062), cljs.core.str(" and "), cljs.core.str(cljs.core.first.call(null, be2__10066)), cljs.core.str(", and neither is preferred")].join(""));
      }
      return be2__10066
    }else {
      return be
    }
  }, null, cljs.core.deref.call(null, method_table));
  if(cljs.core.truth_(best_entry__10067)) {
    if(cljs.core._EQ_.call(null, cljs.core.deref.call(null, cached_hierarchy), cljs.core.deref.call(null, hierarchy))) {
      cljs.core.swap_BANG_.call(null, method_cache, cljs.core.assoc, dispatch_val, cljs.core.second.call(null, best_entry__10067));
      return cljs.core.second.call(null, best_entry__10067)
    }else {
      cljs.core.reset_cache.call(null, method_cache, method_table, cached_hierarchy, hierarchy);
      return find_and_cache_best_method.call(null, name, dispatch_val, hierarchy, method_table, prefer_table, method_cache, cached_hierarchy)
    }
  }else {
    return null
  }
};
cljs.core.IMultiFn = {};
cljs.core._reset = function _reset(mf) {
  if(function() {
    var and__3822__auto____10072 = mf;
    if(and__3822__auto____10072) {
      return mf.cljs$core$IMultiFn$_reset$arity$1
    }else {
      return and__3822__auto____10072
    }
  }()) {
    return mf.cljs$core$IMultiFn$_reset$arity$1(mf)
  }else {
    var x__2363__auto____10073 = mf == null ? null : mf;
    return function() {
      var or__3824__auto____10074 = cljs.core._reset[goog.typeOf(x__2363__auto____10073)];
      if(or__3824__auto____10074) {
        return or__3824__auto____10074
      }else {
        var or__3824__auto____10075 = cljs.core._reset["_"];
        if(or__3824__auto____10075) {
          return or__3824__auto____10075
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-reset", mf);
        }
      }
    }().call(null, mf)
  }
};
cljs.core._add_method = function _add_method(mf, dispatch_val, method) {
  if(function() {
    var and__3822__auto____10080 = mf;
    if(and__3822__auto____10080) {
      return mf.cljs$core$IMultiFn$_add_method$arity$3
    }else {
      return and__3822__auto____10080
    }
  }()) {
    return mf.cljs$core$IMultiFn$_add_method$arity$3(mf, dispatch_val, method)
  }else {
    var x__2363__auto____10081 = mf == null ? null : mf;
    return function() {
      var or__3824__auto____10082 = cljs.core._add_method[goog.typeOf(x__2363__auto____10081)];
      if(or__3824__auto____10082) {
        return or__3824__auto____10082
      }else {
        var or__3824__auto____10083 = cljs.core._add_method["_"];
        if(or__3824__auto____10083) {
          return or__3824__auto____10083
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-add-method", mf);
        }
      }
    }().call(null, mf, dispatch_val, method)
  }
};
cljs.core._remove_method = function _remove_method(mf, dispatch_val) {
  if(function() {
    var and__3822__auto____10088 = mf;
    if(and__3822__auto____10088) {
      return mf.cljs$core$IMultiFn$_remove_method$arity$2
    }else {
      return and__3822__auto____10088
    }
  }()) {
    return mf.cljs$core$IMultiFn$_remove_method$arity$2(mf, dispatch_val)
  }else {
    var x__2363__auto____10089 = mf == null ? null : mf;
    return function() {
      var or__3824__auto____10090 = cljs.core._remove_method[goog.typeOf(x__2363__auto____10089)];
      if(or__3824__auto____10090) {
        return or__3824__auto____10090
      }else {
        var or__3824__auto____10091 = cljs.core._remove_method["_"];
        if(or__3824__auto____10091) {
          return or__3824__auto____10091
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-remove-method", mf);
        }
      }
    }().call(null, mf, dispatch_val)
  }
};
cljs.core._prefer_method = function _prefer_method(mf, dispatch_val, dispatch_val_y) {
  if(function() {
    var and__3822__auto____10096 = mf;
    if(and__3822__auto____10096) {
      return mf.cljs$core$IMultiFn$_prefer_method$arity$3
    }else {
      return and__3822__auto____10096
    }
  }()) {
    return mf.cljs$core$IMultiFn$_prefer_method$arity$3(mf, dispatch_val, dispatch_val_y)
  }else {
    var x__2363__auto____10097 = mf == null ? null : mf;
    return function() {
      var or__3824__auto____10098 = cljs.core._prefer_method[goog.typeOf(x__2363__auto____10097)];
      if(or__3824__auto____10098) {
        return or__3824__auto____10098
      }else {
        var or__3824__auto____10099 = cljs.core._prefer_method["_"];
        if(or__3824__auto____10099) {
          return or__3824__auto____10099
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-prefer-method", mf);
        }
      }
    }().call(null, mf, dispatch_val, dispatch_val_y)
  }
};
cljs.core._get_method = function _get_method(mf, dispatch_val) {
  if(function() {
    var and__3822__auto____10104 = mf;
    if(and__3822__auto____10104) {
      return mf.cljs$core$IMultiFn$_get_method$arity$2
    }else {
      return and__3822__auto____10104
    }
  }()) {
    return mf.cljs$core$IMultiFn$_get_method$arity$2(mf, dispatch_val)
  }else {
    var x__2363__auto____10105 = mf == null ? null : mf;
    return function() {
      var or__3824__auto____10106 = cljs.core._get_method[goog.typeOf(x__2363__auto____10105)];
      if(or__3824__auto____10106) {
        return or__3824__auto____10106
      }else {
        var or__3824__auto____10107 = cljs.core._get_method["_"];
        if(or__3824__auto____10107) {
          return or__3824__auto____10107
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-get-method", mf);
        }
      }
    }().call(null, mf, dispatch_val)
  }
};
cljs.core._methods = function _methods(mf) {
  if(function() {
    var and__3822__auto____10112 = mf;
    if(and__3822__auto____10112) {
      return mf.cljs$core$IMultiFn$_methods$arity$1
    }else {
      return and__3822__auto____10112
    }
  }()) {
    return mf.cljs$core$IMultiFn$_methods$arity$1(mf)
  }else {
    var x__2363__auto____10113 = mf == null ? null : mf;
    return function() {
      var or__3824__auto____10114 = cljs.core._methods[goog.typeOf(x__2363__auto____10113)];
      if(or__3824__auto____10114) {
        return or__3824__auto____10114
      }else {
        var or__3824__auto____10115 = cljs.core._methods["_"];
        if(or__3824__auto____10115) {
          return or__3824__auto____10115
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-methods", mf);
        }
      }
    }().call(null, mf)
  }
};
cljs.core._prefers = function _prefers(mf) {
  if(function() {
    var and__3822__auto____10120 = mf;
    if(and__3822__auto____10120) {
      return mf.cljs$core$IMultiFn$_prefers$arity$1
    }else {
      return and__3822__auto____10120
    }
  }()) {
    return mf.cljs$core$IMultiFn$_prefers$arity$1(mf)
  }else {
    var x__2363__auto____10121 = mf == null ? null : mf;
    return function() {
      var or__3824__auto____10122 = cljs.core._prefers[goog.typeOf(x__2363__auto____10121)];
      if(or__3824__auto____10122) {
        return or__3824__auto____10122
      }else {
        var or__3824__auto____10123 = cljs.core._prefers["_"];
        if(or__3824__auto____10123) {
          return or__3824__auto____10123
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-prefers", mf);
        }
      }
    }().call(null, mf)
  }
};
cljs.core._dispatch = function _dispatch(mf, args) {
  if(function() {
    var and__3822__auto____10128 = mf;
    if(and__3822__auto____10128) {
      return mf.cljs$core$IMultiFn$_dispatch$arity$2
    }else {
      return and__3822__auto____10128
    }
  }()) {
    return mf.cljs$core$IMultiFn$_dispatch$arity$2(mf, args)
  }else {
    var x__2363__auto____10129 = mf == null ? null : mf;
    return function() {
      var or__3824__auto____10130 = cljs.core._dispatch[goog.typeOf(x__2363__auto____10129)];
      if(or__3824__auto____10130) {
        return or__3824__auto____10130
      }else {
        var or__3824__auto____10131 = cljs.core._dispatch["_"];
        if(or__3824__auto____10131) {
          return or__3824__auto____10131
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-dispatch", mf);
        }
      }
    }().call(null, mf, args)
  }
};
cljs.core.do_dispatch = function do_dispatch(mf, dispatch_fn, args) {
  var dispatch_val__10134 = cljs.core.apply.call(null, dispatch_fn, args);
  var target_fn__10135 = cljs.core._get_method.call(null, mf, dispatch_val__10134);
  if(cljs.core.truth_(target_fn__10135)) {
  }else {
    throw new Error([cljs.core.str("No method in multimethod '"), cljs.core.str(cljs.core.name), cljs.core.str("' for dispatch value: "), cljs.core.str(dispatch_val__10134)].join(""));
  }
  return cljs.core.apply.call(null, target_fn__10135, args)
};
cljs.core.MultiFn = function(name, dispatch_fn, default_dispatch_val, hierarchy, method_table, prefer_table, method_cache, cached_hierarchy) {
  this.name = name;
  this.dispatch_fn = dispatch_fn;
  this.default_dispatch_val = default_dispatch_val;
  this.hierarchy = hierarchy;
  this.method_table = method_table;
  this.prefer_table = prefer_table;
  this.method_cache = method_cache;
  this.cached_hierarchy = cached_hierarchy;
  this.cljs$lang$protocol_mask$partition0$ = 4194304;
  this.cljs$lang$protocol_mask$partition1$ = 64
};
cljs.core.MultiFn.cljs$lang$type = true;
cljs.core.MultiFn.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/MultiFn")
};
cljs.core.MultiFn.prototype.cljs$core$IHash$_hash$arity$1 = function(this$) {
  var this__10136 = this;
  return goog.getUid(this$)
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_reset$arity$1 = function(mf) {
  var this__10137 = this;
  cljs.core.swap_BANG_.call(null, this__10137.method_table, function(mf) {
    return cljs.core.ObjMap.EMPTY
  });
  cljs.core.swap_BANG_.call(null, this__10137.method_cache, function(mf) {
    return cljs.core.ObjMap.EMPTY
  });
  cljs.core.swap_BANG_.call(null, this__10137.prefer_table, function(mf) {
    return cljs.core.ObjMap.EMPTY
  });
  cljs.core.swap_BANG_.call(null, this__10137.cached_hierarchy, function(mf) {
    return null
  });
  return mf
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_add_method$arity$3 = function(mf, dispatch_val, method) {
  var this__10138 = this;
  cljs.core.swap_BANG_.call(null, this__10138.method_table, cljs.core.assoc, dispatch_val, method);
  cljs.core.reset_cache.call(null, this__10138.method_cache, this__10138.method_table, this__10138.cached_hierarchy, this__10138.hierarchy);
  return mf
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_remove_method$arity$2 = function(mf, dispatch_val) {
  var this__10139 = this;
  cljs.core.swap_BANG_.call(null, this__10139.method_table, cljs.core.dissoc, dispatch_val);
  cljs.core.reset_cache.call(null, this__10139.method_cache, this__10139.method_table, this__10139.cached_hierarchy, this__10139.hierarchy);
  return mf
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_get_method$arity$2 = function(mf, dispatch_val) {
  var this__10140 = this;
  if(cljs.core._EQ_.call(null, cljs.core.deref.call(null, this__10140.cached_hierarchy), cljs.core.deref.call(null, this__10140.hierarchy))) {
  }else {
    cljs.core.reset_cache.call(null, this__10140.method_cache, this__10140.method_table, this__10140.cached_hierarchy, this__10140.hierarchy)
  }
  var temp__3971__auto____10141 = cljs.core.deref.call(null, this__10140.method_cache).call(null, dispatch_val);
  if(cljs.core.truth_(temp__3971__auto____10141)) {
    var target_fn__10142 = temp__3971__auto____10141;
    return target_fn__10142
  }else {
    var temp__3971__auto____10143 = cljs.core.find_and_cache_best_method.call(null, this__10140.name, dispatch_val, this__10140.hierarchy, this__10140.method_table, this__10140.prefer_table, this__10140.method_cache, this__10140.cached_hierarchy);
    if(cljs.core.truth_(temp__3971__auto____10143)) {
      var target_fn__10144 = temp__3971__auto____10143;
      return target_fn__10144
    }else {
      return cljs.core.deref.call(null, this__10140.method_table).call(null, this__10140.default_dispatch_val)
    }
  }
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_prefer_method$arity$3 = function(mf, dispatch_val_x, dispatch_val_y) {
  var this__10145 = this;
  if(cljs.core.truth_(cljs.core.prefers_STAR_.call(null, dispatch_val_x, dispatch_val_y, this__10145.prefer_table))) {
    throw new Error([cljs.core.str("Preference conflict in multimethod '"), cljs.core.str(this__10145.name), cljs.core.str("': "), cljs.core.str(dispatch_val_y), cljs.core.str(" is already preferred to "), cljs.core.str(dispatch_val_x)].join(""));
  }else {
  }
  cljs.core.swap_BANG_.call(null, this__10145.prefer_table, function(old) {
    return cljs.core.assoc.call(null, old, dispatch_val_x, cljs.core.conj.call(null, cljs.core._lookup.call(null, old, dispatch_val_x, cljs.core.PersistentHashSet.EMPTY), dispatch_val_y))
  });
  return cljs.core.reset_cache.call(null, this__10145.method_cache, this__10145.method_table, this__10145.cached_hierarchy, this__10145.hierarchy)
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_methods$arity$1 = function(mf) {
  var this__10146 = this;
  return cljs.core.deref.call(null, this__10146.method_table)
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_prefers$arity$1 = function(mf) {
  var this__10147 = this;
  return cljs.core.deref.call(null, this__10147.prefer_table)
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_dispatch$arity$2 = function(mf, args) {
  var this__10148 = this;
  return cljs.core.do_dispatch.call(null, mf, this__10148.dispatch_fn, args)
};
cljs.core.MultiFn;
cljs.core.MultiFn.prototype.call = function() {
  var G__10150__delegate = function(_, args) {
    var self__10149 = this;
    return cljs.core._dispatch.call(null, self__10149, args)
  };
  var G__10150 = function(_, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return G__10150__delegate.call(this, _, args)
  };
  G__10150.cljs$lang$maxFixedArity = 1;
  G__10150.cljs$lang$applyTo = function(arglist__10151) {
    var _ = cljs.core.first(arglist__10151);
    var args = cljs.core.rest(arglist__10151);
    return G__10150__delegate(_, args)
  };
  G__10150.cljs$lang$arity$variadic = G__10150__delegate;
  return G__10150
}();
cljs.core.MultiFn.prototype.apply = function(_, args) {
  var self__10152 = this;
  return cljs.core._dispatch.call(null, self__10152, args)
};
cljs.core.remove_all_methods = function remove_all_methods(multifn) {
  return cljs.core._reset.call(null, multifn)
};
cljs.core.remove_method = function remove_method(multifn, dispatch_val) {
  return cljs.core._remove_method.call(null, multifn, dispatch_val)
};
cljs.core.prefer_method = function prefer_method(multifn, dispatch_val_x, dispatch_val_y) {
  return cljs.core._prefer_method.call(null, multifn, dispatch_val_x, dispatch_val_y)
};
cljs.core.methods$ = function methods$(multifn) {
  return cljs.core._methods.call(null, multifn)
};
cljs.core.get_method = function get_method(multifn, dispatch_val) {
  return cljs.core._get_method.call(null, multifn, dispatch_val)
};
cljs.core.prefers = function prefers(multifn) {
  return cljs.core._prefers.call(null, multifn)
};
cljs.core.UUID = function(uuid) {
  this.uuid = uuid;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 543162368
};
cljs.core.UUID.cljs$lang$type = true;
cljs.core.UUID.cljs$lang$ctorPrSeq = function(this__2309__auto__) {
  return cljs.core.list.call(null, "cljs.core/UUID")
};
cljs.core.UUID.prototype.cljs$core$IHash$_hash$arity$1 = function(this$) {
  var this__10153 = this;
  return goog.string.hashCode(cljs.core.pr_str.call(null, this$))
};
cljs.core.UUID.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(_10155, _) {
  var this__10154 = this;
  return cljs.core.list.call(null, [cljs.core.str('#uuid "'), cljs.core.str(this__10154.uuid), cljs.core.str('"')].join(""))
};
cljs.core.UUID.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(_, other) {
  var this__10156 = this;
  var and__3822__auto____10157 = cljs.core.instance_QMARK_.call(null, cljs.core.UUID, other);
  if(and__3822__auto____10157) {
    return this__10156.uuid === other.uuid
  }else {
    return and__3822__auto____10157
  }
};
cljs.core.UUID.prototype.toString = function() {
  var this__10158 = this;
  var this__10159 = this;
  return cljs.core.pr_str.call(null, this__10159)
};
cljs.core.UUID;
goog.provide("rdfa.dom");
goog.require("cljs.core");
rdfa.dom.DomAccess = {};
rdfa.dom.get_name = function get_name(this$) {
  if(function() {
    var and__3822__auto____10164 = this$;
    if(and__3822__auto____10164) {
      return this$.rdfa$dom$DomAccess$get_name$arity$1
    }else {
      return and__3822__auto____10164
    }
  }()) {
    return this$.rdfa$dom$DomAccess$get_name$arity$1(this$)
  }else {
    var x__2363__auto____10165 = this$ == null ? null : this$;
    return function() {
      var or__3824__auto____10166 = rdfa.dom.get_name[goog.typeOf(x__2363__auto____10165)];
      if(or__3824__auto____10166) {
        return or__3824__auto____10166
      }else {
        var or__3824__auto____10167 = rdfa.dom.get_name["_"];
        if(or__3824__auto____10167) {
          return or__3824__auto____10167
        }else {
          throw cljs.core.missing_protocol.call(null, "DomAccess.get-name", this$);
        }
      }
    }().call(null, this$)
  }
};
rdfa.dom.get_attr = function get_attr(this$, attr_name) {
  if(function() {
    var and__3822__auto____10172 = this$;
    if(and__3822__auto____10172) {
      return this$.rdfa$dom$DomAccess$get_attr$arity$2
    }else {
      return and__3822__auto____10172
    }
  }()) {
    return this$.rdfa$dom$DomAccess$get_attr$arity$2(this$, attr_name)
  }else {
    var x__2363__auto____10173 = this$ == null ? null : this$;
    return function() {
      var or__3824__auto____10174 = rdfa.dom.get_attr[goog.typeOf(x__2363__auto____10173)];
      if(or__3824__auto____10174) {
        return or__3824__auto____10174
      }else {
        var or__3824__auto____10175 = rdfa.dom.get_attr["_"];
        if(or__3824__auto____10175) {
          return or__3824__auto____10175
        }else {
          throw cljs.core.missing_protocol.call(null, "DomAccess.get-attr", this$);
        }
      }
    }().call(null, this$, attr_name)
  }
};
rdfa.dom.get_ns_map = function get_ns_map(this$) {
  if(function() {
    var and__3822__auto____10180 = this$;
    if(and__3822__auto____10180) {
      return this$.rdfa$dom$DomAccess$get_ns_map$arity$1
    }else {
      return and__3822__auto____10180
    }
  }()) {
    return this$.rdfa$dom$DomAccess$get_ns_map$arity$1(this$)
  }else {
    var x__2363__auto____10181 = this$ == null ? null : this$;
    return function() {
      var or__3824__auto____10182 = rdfa.dom.get_ns_map[goog.typeOf(x__2363__auto____10181)];
      if(or__3824__auto____10182) {
        return or__3824__auto____10182
      }else {
        var or__3824__auto____10183 = rdfa.dom.get_ns_map["_"];
        if(or__3824__auto____10183) {
          return or__3824__auto____10183
        }else {
          throw cljs.core.missing_protocol.call(null, "DomAccess.get-ns-map", this$);
        }
      }
    }().call(null, this$)
  }
};
rdfa.dom.is_root_QMARK_ = function is_root_QMARK_(this$) {
  if(function() {
    var and__3822__auto____10188 = this$;
    if(and__3822__auto____10188) {
      return this$.rdfa$dom$DomAccess$is_root_QMARK_$arity$1
    }else {
      return and__3822__auto____10188
    }
  }()) {
    return this$.rdfa$dom$DomAccess$is_root_QMARK_$arity$1(this$)
  }else {
    var x__2363__auto____10189 = this$ == null ? null : this$;
    return function() {
      var or__3824__auto____10190 = rdfa.dom.is_root_QMARK_[goog.typeOf(x__2363__auto____10189)];
      if(or__3824__auto____10190) {
        return or__3824__auto____10190
      }else {
        var or__3824__auto____10191 = rdfa.dom.is_root_QMARK_["_"];
        if(or__3824__auto____10191) {
          return or__3824__auto____10191
        }else {
          throw cljs.core.missing_protocol.call(null, "DomAccess.is-root?", this$);
        }
      }
    }().call(null, this$)
  }
};
rdfa.dom.find_by_tag = function find_by_tag(this$, tag) {
  if(function() {
    var and__3822__auto____10196 = this$;
    if(and__3822__auto____10196) {
      return this$.rdfa$dom$DomAccess$find_by_tag$arity$2
    }else {
      return and__3822__auto____10196
    }
  }()) {
    return this$.rdfa$dom$DomAccess$find_by_tag$arity$2(this$, tag)
  }else {
    var x__2363__auto____10197 = this$ == null ? null : this$;
    return function() {
      var or__3824__auto____10198 = rdfa.dom.find_by_tag[goog.typeOf(x__2363__auto____10197)];
      if(or__3824__auto____10198) {
        return or__3824__auto____10198
      }else {
        var or__3824__auto____10199 = rdfa.dom.find_by_tag["_"];
        if(or__3824__auto____10199) {
          return or__3824__auto____10199
        }else {
          throw cljs.core.missing_protocol.call(null, "DomAccess.find-by-tag", this$);
        }
      }
    }().call(null, this$, tag)
  }
};
rdfa.dom.get_child_elements = function get_child_elements(this$) {
  if(function() {
    var and__3822__auto____10204 = this$;
    if(and__3822__auto____10204) {
      return this$.rdfa$dom$DomAccess$get_child_elements$arity$1
    }else {
      return and__3822__auto____10204
    }
  }()) {
    return this$.rdfa$dom$DomAccess$get_child_elements$arity$1(this$)
  }else {
    var x__2363__auto____10205 = this$ == null ? null : this$;
    return function() {
      var or__3824__auto____10206 = rdfa.dom.get_child_elements[goog.typeOf(x__2363__auto____10205)];
      if(or__3824__auto____10206) {
        return or__3824__auto____10206
      }else {
        var or__3824__auto____10207 = rdfa.dom.get_child_elements["_"];
        if(or__3824__auto____10207) {
          return or__3824__auto____10207
        }else {
          throw cljs.core.missing_protocol.call(null, "DomAccess.get-child-elements", this$);
        }
      }
    }().call(null, this$)
  }
};
rdfa.dom.get_text = function get_text(this$) {
  if(function() {
    var and__3822__auto____10212 = this$;
    if(and__3822__auto____10212) {
      return this$.rdfa$dom$DomAccess$get_text$arity$1
    }else {
      return and__3822__auto____10212
    }
  }()) {
    return this$.rdfa$dom$DomAccess$get_text$arity$1(this$)
  }else {
    var x__2363__auto____10213 = this$ == null ? null : this$;
    return function() {
      var or__3824__auto____10214 = rdfa.dom.get_text[goog.typeOf(x__2363__auto____10213)];
      if(or__3824__auto____10214) {
        return or__3824__auto____10214
      }else {
        var or__3824__auto____10215 = rdfa.dom.get_text["_"];
        if(or__3824__auto____10215) {
          return or__3824__auto____10215
        }else {
          throw cljs.core.missing_protocol.call(null, "DomAccess.get-text", this$);
        }
      }
    }().call(null, this$)
  }
};
rdfa.dom.get_inner_xml = function get_inner_xml(this$, xmlns_map, lang) {
  if(function() {
    var and__3822__auto____10220 = this$;
    if(and__3822__auto____10220) {
      return this$.rdfa$dom$DomAccess$get_inner_xml$arity$3
    }else {
      return and__3822__auto____10220
    }
  }()) {
    return this$.rdfa$dom$DomAccess$get_inner_xml$arity$3(this$, xmlns_map, lang)
  }else {
    var x__2363__auto____10221 = this$ == null ? null : this$;
    return function() {
      var or__3824__auto____10222 = rdfa.dom.get_inner_xml[goog.typeOf(x__2363__auto____10221)];
      if(or__3824__auto____10222) {
        return or__3824__auto____10222
      }else {
        var or__3824__auto____10223 = rdfa.dom.get_inner_xml["_"];
        if(or__3824__auto____10223) {
          return or__3824__auto____10223
        }else {
          throw cljs.core.missing_protocol.call(null, "DomAccess.get-inner-xml", this$);
        }
      }
    }().call(null, this$, xmlns_map, lang)
  }
};
goog.provide("clojure.string");
goog.require("cljs.core");
goog.require("goog.string.StringBuffer");
goog.require("goog.string");
clojure.string.seq_reverse = function seq_reverse(coll) {
  return cljs.core.reduce.call(null, cljs.core.conj, cljs.core.List.EMPTY, coll)
};
clojure.string.reverse = function reverse(s) {
  return s.split("").reverse().join("")
};
clojure.string.replace = function replace(s, match, replacement) {
  if(cljs.core.string_QMARK_.call(null, match)) {
    return s.replace(new RegExp(goog.string.regExpEscape(match), "g"), replacement)
  }else {
    if(cljs.core.truth_(match.hasOwnProperty("source"))) {
      return s.replace(new RegExp(match.source, "g"), replacement)
    }else {
      if("\ufdd0'else") {
        throw[cljs.core.str("Invalid match arg: "), cljs.core.str(match)].join("");
      }else {
        return null
      }
    }
  }
};
clojure.string.replace_first = function replace_first(s, match, replacement) {
  return s.replace(match, replacement)
};
clojure.string.join = function() {
  var join = null;
  var join__1 = function(coll) {
    return cljs.core.apply.call(null, cljs.core.str, coll)
  };
  var join__2 = function(separator, coll) {
    return cljs.core.apply.call(null, cljs.core.str, cljs.core.interpose.call(null, separator, coll))
  };
  join = function(separator, coll) {
    switch(arguments.length) {
      case 1:
        return join__1.call(this, separator);
      case 2:
        return join__2.call(this, separator, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  join.cljs$lang$arity$1 = join__1;
  join.cljs$lang$arity$2 = join__2;
  return join
}();
clojure.string.upper_case = function upper_case(s) {
  return s.toUpperCase()
};
clojure.string.lower_case = function lower_case(s) {
  return s.toLowerCase()
};
clojure.string.capitalize = function capitalize(s) {
  if(cljs.core.count.call(null, s) < 2) {
    return clojure.string.upper_case.call(null, s)
  }else {
    return[cljs.core.str(clojure.string.upper_case.call(null, cljs.core.subs.call(null, s, 0, 1))), cljs.core.str(clojure.string.lower_case.call(null, cljs.core.subs.call(null, s, 1)))].join("")
  }
};
clojure.string.split = function() {
  var split = null;
  var split__2 = function(s, re) {
    return cljs.core.vec.call(null, [cljs.core.str(s)].join("").split(re))
  };
  var split__3 = function(s, re, limit) {
    if(limit < 1) {
      return cljs.core.vec.call(null, [cljs.core.str(s)].join("").split(re))
    }else {
      var s__10230 = s;
      var limit__10231 = limit;
      var parts__10232 = cljs.core.PersistentVector.EMPTY;
      while(true) {
        if(cljs.core._EQ_.call(null, limit__10231, 1)) {
          return cljs.core.conj.call(null, parts__10232, s__10230)
        }else {
          var temp__3971__auto____10233 = cljs.core.re_find.call(null, re, s__10230);
          if(cljs.core.truth_(temp__3971__auto____10233)) {
            var m__10234 = temp__3971__auto____10233;
            var index__10235 = s__10230.indexOf(m__10234);
            var G__10236 = s__10230.substring(index__10235 + cljs.core.count.call(null, m__10234));
            var G__10237 = limit__10231 - 1;
            var G__10238 = cljs.core.conj.call(null, parts__10232, s__10230.substring(0, index__10235));
            s__10230 = G__10236;
            limit__10231 = G__10237;
            parts__10232 = G__10238;
            continue
          }else {
            return cljs.core.conj.call(null, parts__10232, s__10230)
          }
        }
        break
      }
    }
  };
  split = function(s, re, limit) {
    switch(arguments.length) {
      case 2:
        return split__2.call(this, s, re);
      case 3:
        return split__3.call(this, s, re, limit)
    }
    throw"Invalid arity: " + arguments.length;
  };
  split.cljs$lang$arity$2 = split__2;
  split.cljs$lang$arity$3 = split__3;
  return split
}();
clojure.string.split_lines = function split_lines(s) {
  return clojure.string.split.call(null, s, /\n|\r\n/)
};
clojure.string.trim = function trim(s) {
  return goog.string.trim(s)
};
clojure.string.triml = function triml(s) {
  return goog.string.trimLeft(s)
};
clojure.string.trimr = function trimr(s) {
  return goog.string.trimRight(s)
};
clojure.string.trim_newline = function trim_newline(s) {
  var index__10242 = s.length;
  while(true) {
    if(index__10242 === 0) {
      return""
    }else {
      var ch__10243 = cljs.core._lookup.call(null, s, index__10242 - 1, null);
      if(function() {
        var or__3824__auto____10244 = cljs.core._EQ_.call(null, ch__10243, "\n");
        if(or__3824__auto____10244) {
          return or__3824__auto____10244
        }else {
          return cljs.core._EQ_.call(null, ch__10243, "\r")
        }
      }()) {
        var G__10245 = index__10242 - 1;
        index__10242 = G__10245;
        continue
      }else {
        return s.substring(0, index__10242)
      }
    }
    break
  }
};
clojure.string.blank_QMARK_ = function blank_QMARK_(s) {
  var s__10249 = [cljs.core.str(s)].join("");
  if(cljs.core.truth_(function() {
    var or__3824__auto____10250 = cljs.core.not.call(null, s__10249);
    if(or__3824__auto____10250) {
      return or__3824__auto____10250
    }else {
      var or__3824__auto____10251 = cljs.core._EQ_.call(null, "", s__10249);
      if(or__3824__auto____10251) {
        return or__3824__auto____10251
      }else {
        return cljs.core.re_matches.call(null, /\s+/, s__10249)
      }
    }
  }())) {
    return true
  }else {
    return false
  }
};
clojure.string.escape = function escape(s, cmap) {
  var buffer__10258 = new goog.string.StringBuffer;
  var length__10259 = s.length;
  var index__10260 = 0;
  while(true) {
    if(cljs.core._EQ_.call(null, length__10259, index__10260)) {
      return buffer__10258.toString()
    }else {
      var ch__10261 = s.charAt(index__10260);
      var temp__3971__auto____10262 = cljs.core._lookup.call(null, cmap, ch__10261, null);
      if(cljs.core.truth_(temp__3971__auto____10262)) {
        var replacement__10263 = temp__3971__auto____10262;
        buffer__10258.append([cljs.core.str(replacement__10263)].join(""))
      }else {
        buffer__10258.append(ch__10261)
      }
      var G__10264 = index__10260 + 1;
      index__10260 = G__10264;
      continue
    }
    break
  }
};
goog.provide("rdfa.stddom");
goog.require("cljs.core");
goog.require("rdfa.dom");
goog.require("clojure.string");
rdfa.stddom.node_list = function node_list(nl) {
  if(!(nl == null)) {
    var index__6204 = nl.length - 1;
    var nodes__6205 = null;
    while(true) {
      if(cljs.core._EQ_.call(null, index__6204, -1)) {
        return nodes__6205
      }else {
        var G__6206 = index__6204 - 1;
        var G__6207 = cljs.core.cons.call(null, nl.item(index__6204), nodes__6205);
        index__6204 = G__6206;
        nodes__6205 = G__6207;
        continue
      }
      break
    }
  }else {
    return null
  }
};
Node.prototype.rdfa$dom$DomAccess$ = true;
Node.prototype.rdfa$dom$DomAccess$get_name$arity$1 = function(this$) {
  return this$.nodeName
};
Node.prototype.rdfa$dom$DomAccess$get_attr$arity$2 = function(this$, attr_name) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____6208 = this$.hasAttribute;
    if(cljs.core.truth_(and__3822__auto____6208)) {
      return this$.hasAttribute(attr_name)
    }else {
      return and__3822__auto____6208
    }
  }())) {
    return this$.getAttribute(attr_name)
  }else {
    return null
  }
};
Node.prototype.rdfa$dom$DomAccess$get_ns_map$arity$1 = function(this$) {
  return cljs.core.into.call(null, cljs.core.ObjMap.EMPTY, function() {
    var iter__2462__auto____6215 = function iter__6209(s__6210) {
      return new cljs.core.LazySeq(null, false, function() {
        var s__6210__6213 = s__6210;
        while(true) {
          if(cljs.core.seq.call(null, s__6210__6213)) {
            var attr__6214 = cljs.core.first.call(null, s__6210__6213);
            if(cljs.core._EQ_.call(null, cljs.core.subs.call(null, rdfa.dom.get_name.call(null, attr__6214), 0, 6), "xmlns:")) {
              return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([cljs.core.subs.call(null, rdfa.dom.get_name.call(null, attr__6214), 6), attr__6214.value], true), iter__6209.call(null, cljs.core.rest.call(null, s__6210__6213)))
            }else {
              var G__6219 = cljs.core.rest.call(null, s__6210__6213);
              s__6210__6213 = G__6219;
              continue
            }
          }else {
            return null
          }
          break
        }
      }, null)
    };
    return iter__2462__auto____6215.call(null, rdfa.stddom.node_list.call(null, this$.attributes))
  }())
};
Node.prototype.rdfa$dom$DomAccess$is_root_QMARK_$arity$1 = function(this$) {
  var temp__3971__auto____6216 = this$.ownerDocument;
  if(cljs.core.truth_(temp__3971__auto____6216)) {
    var owner_document__6217 = temp__3971__auto____6216;
    return cljs.core._EQ_.call(null, this$, owner_document__6217.documentElement)
  }else {
    return null
  }
};
Node.prototype.rdfa$dom$DomAccess$find_by_tag$arity$2 = function(this$, tag) {
  return rdfa.stddom.node_list.call(null, this$.getElementsByTagName(tag))
};
Node.prototype.rdfa$dom$DomAccess$get_child_elements$arity$1 = function(this$) {
  return cljs.core.filter.call(null, function(p1__6201_SHARP_) {
    return cljs.core._EQ_.call(null, p1__6201_SHARP_.nodeType, Node.ELEMENT_NODE)
  }, rdfa.stddom.node_list.call(null, this$.childNodes))
};
Node.prototype.rdfa$dom$DomAccess$get_text$arity$1 = function(this$) {
  var get_values__6218 = function get_values(node) {
    return cljs.core.cons.call(null, cljs.core._EQ_.call(null, node.nodeType, Node.TEXT_NODE) ? node.nodeValue : null, cljs.core.map.call(null, get_values, rdfa.stddom.node_list.call(null, node.childNodes)))
  };
  return clojure.string.join.call(null, cljs.core.flatten.call(null, get_values__6218.call(null, this$)))
};
Node.prototype.rdfa$dom$DomAccess$get_inner_xml$arity$3 = function(this$, xmlns_map, lang) {
  return""
};
