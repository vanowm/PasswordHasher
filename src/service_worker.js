"use strict";
!function(exports)
{
const log = console.log.bind(console),
      COMPACT = 1,
      OUTSIDE = 2,
      BOTTOM = 4,
      LEFT = 8,
      RIGHT = 16,
      ALLOWED = [ BOTTOM ,BOTTOM | COMPACT, BOTTOM | RIGHT   ,BOTTOM | RIGHT   | COMPACT,
                  LEFT   ,LEFT   | COMPACT, LEFT   | OUTSIDE ,LEFT   | OUTSIDE | COMPACT,
                  RIGHT  ,RIGHT  | COMPACT, RIGHT  | OUTSIDE ,RIGHT  | OUTSIDE | COMPACT],
      OPTSDEFAULT =
      {
//a:{default:""},
        autocomplete:       {default: false},
        fontSize:           {default: 12, min: 10, max: 30},
      guessFullDomain:    {default: true},
      guessSiteTag:       {default: false},
      siteTagToMasterKey: {default: false},
        hashWordSize:       {default: 26, min: 4, max: 100},
        encrypt:            {default: ""},
        lastOptions:        {default: ""},
        markerPosition:     {default: BOTTOM,
                                filter: function(i)
                                {
                                  i = ~~i;
                                  if (i < 4 || i > 21 || ALLOWED.indexOf(i) == -1)
                                    return BOTTOM;

                                  return i;
                                }
                              },
        markerSize:         {default: 12, min: 4, max: 20},
        masterKeyAddTag:    {default: false},
        optionsHidden:      {default: true},
      rememberMasterKey:  {default: true},
        rememberSiteTag:    {default: true},
        requireDigit:       {default: true},
        requireMixedCase:   {default: true},
        requirePunctuation: {default: true},
      restoreLast:        {default: true},
        restrictPunctuation:{default: 1,
                                min: 0,
                                get max()
                                {
                                  return OPTBITS.restrictPunctuation;
                                }
                              },
        revealHashWord:     {default: false},
        revealMasterKey:    {default: false},
        revealSiteTag:      {default: true},
        sha3:               {default: true},
        shortcutKeyCode:    {default: "VK_F6"},
        shortcutKeyMods:    {default: "accel"},
        showMarker:         {default: false}, /* doesn't work */
        showUnmask:         {default: true},
      },

      OPTBITS = //options saved as float, each bit represent certain setting
      {
        hashWordSize: 127,
        requireDigit: 128,
        requirePunctuation: 256,
        requireMixedCase: 1024,
        restrictSpecial: 2048,
        restrictDigits: 4096,
        sha3: 8192,
        restrictPunctuation: 2147483647, //30 characters bitwise stored as number after decimal point of options value, starting at bit2.
                                         //bit1 used as identifier of new default 30 charcters
                                         //each set bit represents diactivated character
        restrictPunctuationLegacy: 65535 //legacy 15 character bitwise after decimal point starting at bit2. Bit1 is unused.
      },

      DATA = {
        list: {},
        options: {},
      },

      PREFSAVE = function()
      {
        STORAGE.set({"options": DATA.options}, function()
        {
log("options saved", DATA.options);
        });
      },

      PREFCHECK = function(key, val, fix)
      {
        let r = null;
        let def = OPTSDEFAULT[key],
            n;

        if (def === undefined)
          return false;

        if (typeof(def.default) != typeof(val))
          r = def.default;

        if (val === undefined)
          val = r;

        if ("min" in def && val < def.min)
        {
          r = def.min;
        }

        if ("max" in def && val > def.max)
        {
          r = def.max;
        }

        if ("filter" in def && (n = def.filter(val)) !== val)
        {
          r = n;
        }
        if (r !== null && fix === false)
          return false;

        return {val: r === null ? val : r , old: val};
      }, //PREFCHECK()

      LISTSAVE = function()
      {
        STORAGE.set({"list": DATA.list}, function()
        {
log("list saved", DATA.list);
        });
      },

      STORAGE = (chrome.storage || browser.storage).local,

      TABS = chrome.tabs || browser.tabs;

//STORAGE.clear();

log("wtf", new Date());

let _frameInfo = {},
    _pass = btoa(""),
    _passTemp = "",
    ports = {},
    passHash =
{
  consts: {
    COMPACT: COMPACT,
    OUTSIDE: OUTSIDE,
    BOTTOM: BOTTOM,
    RIGHT: RIGHT,
    LEFT: LEFT,
    ALLOWED: ALLOWED,
    OPTBITS: OPTBITS,
    OPTSDEFAULT: OPTSDEFAULT
  },

  _i18nCache: {},

  i18n: function(n)
  {
    return this._i18nCache[n] || (this._i18nCache[n] = chrome.i18n.getMessage(n)) || n;
  },

  options: DATA.options,

  pref: function(key, val)
  {
    let r = DATA.options[key];

log(key, val, r, PREFCHECK(key, val));
    if (val !== undefined && r !== val && (val = PREFCHECK(key, val)))
    {
      DATA.options[key] = val.val;
      this.prefSave();
    }
    return r;
  },

  prefSave: function()
  {
    return PREFSAVE();
  },

  list: function(domain, val)
  {
    let r = DATA.list[domain] || [];
log(domain, val, DATA.list[domain], DATA.list);
    if (val !== undefined)
    {
      if (val[1] && typeof(val[1]) == "object")
        val[1] = Object.assign({}, val[1]);

      DATA.list[domain] = Object.assign([], val);
      this.listSave();
    }
    return r;
  },

  listRemove: function(domain, save)
  {
    delete DATA.list[domain];
    if (save || save === undefined)
      this.listSave();
  },

  listSave: function()
  {
    LISTSAVE();
  },

  isIP: function(domain)
  {
    return domain.match(/^(((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))(%.+)?))$/);
  },

  // TODO: There's probably a better way
  getDomain: function(url, all)
  {
    if (typeof(url) == "string")
      url = new URL(url);

    let r = null;
    var h = url.hostname.split(".");
    if (!h.length)
      return r;
    else if (h.length == 1 || this.isIP(url.hostname))
      r = [url.hostname];

    if (r === null)
    {
      // Handle domains like co.uk
      if (h.length > 2 && h[h.length-1].length == 2 && h[h.length-2] == "co")
          r = [h[h.length-3], h[h.length-2], h[h.length-1]];
      else
          r = [h[h.length-2], h[h.length-1]];
    }
    return all ? [r, h] : r.join(".");
  },

  insertPass: function(pass)
  {
    _passTemp = pass;
    chrome.tabs.query({active:true,currentWindow:true}, function(tabs)
    {
      if (!tabs.length)
        return;

      let cmd = JSON.stringify({id:chrome.runtime.id,getpass:""});
      chrome.tabs.executeScript(tabs[0].id, {
          allFrames: false,
          code:
`if(document.activeElement.tagName=="IFRAME")
document.activeElement.contentWindow.postMessage('${cmd}',"*")
else
document.activeElement.ownerDocument.defaultView.postMessage('${cmd}',"*")`
      });
    });
  },

  sha3: function()
  {
    if (!arguments.length || (arguments.length == 1 && (arguments[0] === "" || arguments[0] === undefined)))
      return "";

    let hash = window.sha3_512.create();
    for(let i = 0; i < arguments.length; i++)
      hash.update(arguments[i] + "");

    return hash.hex();
  },

  encryptPassGet: function(v)
  {
    return v == "" ? v : atob(window.XORCipher.encode(this.SESSID, this.SESSID + v))
  },

  encryptPassCheck: function(p)
  {
    return window.XORCipher.decode(this.SESSID, btoa(this.encryptPass)).substr(this.SESSID.length) === p;
  }
} //passHash

function compareVer(a, b)
{
    function prep(t)
    {
        return ("" + t)
          //treat non-numerical characters as lower version
          //replacing them with a negative number based on charcode of first character
          //and remove non alpha-numerical characters
          .replace(/[^0-9\.]+/g, function(c){return "." + ((c = c.replace(/[\W_]+/, "")) ? c.toLowerCase().charCodeAt(0) - 65536 : "") + "."})
          //remove trailing "."
          //and trailing "0" if followed by non-numerical characters (1.0.0b);
          .replace(/(?:\.0+)*(\.-[0-9]+)(\.[0-9]+)?\.*$/g, "$1$2")
          .split('.');
    }
    a = prep(a);
    b = prep(b);
    for (var i = 0; i < Math.max(a.length, b.length); i++)
    {
        //convert to integer the most efficient way
        a[i] = ~~a[i];
        b[i] = ~~b[i];
        if (a[i] > b[i])
            return 1;
        else if (a[i] < b[i])
            return -1;
    }
    return 0;
}
window.addEventListener("load", function()
{
  Object.defineProperties(passHash, {
    encryptPass:
    {
      get()
      {
        return _pass;
      },
      set(v)
      {
        _pass = this.encryptPassGet(v);
        log("password changed", v, " | ",  _pass);
      },
      configurable: false,
      enumerable: false
    },
    encryptPassCheck:
    {
      configurable: false,
      enumerable: false,
      writable: false
    },
    SESSID:
    {
      value: passHash.sha3((new Date()).getTime()),
      configurable: false,
      enumerable: false,
      writable: false
    }
  });
/*
  passHash.encryptPass = "testтест";
  log(passHash.SESSID);
  log(passHash.encryptPass);
  log(btoa(passHash.encryptPass));
  log(window.XORCipher.decode(passHash.SESSID, btoa(passHash.encryptPass)));
  log(window.XORCipher.decode(passHash.SESSID, btoa(passHash.encryptPass)).substr(passHash.SESSID.length));
*/
}, false);

/* Init options */
STORAGE.get(["options", "list"], function(r)
{
log(r);
  let opts = r.options || {},
      list = r.list || {},
      save = false;

  for (let key in opts)
  {
    if (!(key in OPTSDEFAULT) || typeof(opts[key]) != typeof(OPTSDEFAULT[key].default))
    {
      delete opts[key];
      save = true;
    }
  }
  for (let key in OPTSDEFAULT)
  {
    
    let opt = PREFCHECK(key, opts[key]);
    if (opts[key] !== opt.val)
    {
      if (key == "encryptPass")
      {
        
      }
      opts[key] = opt.val;
      save = true;
    }
  }
  DATA.options = opts;
  passHash.options = DATA.options;
  DATA.list = list;

  if (save)
    passHash.prefSave();

  log(save, opts);
});

/* enable page action for all regular tabs */
/*
TABS.query({}, function(tabs)
{
  for (let tab of tabs)
  {
    chrome.browserAction.show(tab.id);
  }
});
*/

/* enable page action for new tabs */
/*
TABS.onUpdated.addListener(function (id)
{
  chrome.browserAction.show(id);
});
*/
/* create context menu item for all editable fields */
try
{
  chrome.menus.create({
    id: 'open-passhash',
    title: 'Password Hasher',
    icons: {
      "16": "ui/style/passhash16.png",
      "32": "ui/style/passhash32.png"
    },
    contexts: ["editable", "password"],
    command: "_execute_page_action",
  });
}
catch(e)
{
}

function getMessageResult(cmd, info)
{
  let d = null,
      data;

  if (typeof(cmd) == "object")
  {
    data = cmd.data;
    cmd = cmd.cmd;
  }
  try
  {
    switch(cmd)
    {
      case "options":
        d = DATA.options;
        break;
      case "list":
        d = DATA.list;
        break;
      case "browserAction":
        break;
      case "info":
        if (!("tab" in info))
        {
          info.tab = {id:-1,windowId: -1};
        }
        if (!("frameId" in info))
          info.frameId = -1;

        if (!info.frameId || !(info.tab.windowId in _frameInfo))
          _frameInfo[info.tab.windowId] = {};

        if (!(info.tab.id in _frameInfo[info.tab.windowId]))
          _frameInfo[info.tab.windowId][info.tab.id] = {};

        _frameInfo[info.tab.windowId][info.tab.id][info.frameId] = {info: info};

        d = {id: info.frameId, frames: _frameInfo[info.tab.windowId][info.tab.id]};
        break;
      case "getpass":
        d = _passTemp;
        _passTemp = ""
        break;
      case "setpass":
        _passTemp = data;
        break;
      case "uniqueID":
        d = passHash.SESSID;
        break;
      default:
        if (passHash.propertyIsEnumerable(cmd) && typeof(passHash[cmd]) != "function")
          d = passHash[cmd];
    }
  }
  catch (e){log(e)}
  let r = {};
  r[cmd] = d;
  return r;
}

chrome.runtime.onMessage.addListener(function(data, info, callback)
{
  if (info.id != chrome.runtime.id)
    return;

  log("background onMessage ", arguments);
  let r = getMessageResult(data, info);
log(r);
  callback(r);
});
try
{
chrome.runtime.sendMessage({id:chrome.runtime.id,cmd:"uniqueID",data:passHash.SESSID}, function(e)
{
  log(passHash.SESSID, arguments);
});
}catch(e){log(e)};

chrome.runtime.onConnect.addListener(function(port)
{
//log(port);
  if (port.sender.id != chrome.runtime.id)
    return;

  let data;
  try
  {
    data = JSON.parse(port.name);
  }
  catch(e)
  {
//log(e);
    return;
  }
//log(data, port);
  ports[data.frameId] = port;
  _frameInfo[data.tab.windowId][data.tab.id][data.frameId].port = port;
  port.onMessage.addListener(function(data)
  {
log("background onConnect ", arguments);
  });
//  port.postMessage("test");
});
//passHash.list("chase.com", ["chase.com","alenka chase.com",1440.5]);

log(chrome.runtime.getManifest());
exports.passHash = passHash;
}(this);
