!function()
{
	"use strict";
	const log = console.log.bind(console),
				$ = function(id)
				{
					return document.getElementById(id);
				};

var pageInfo = {id:0,frames:{}};
var passHash = {
	opts: passHashCommon.opts,
	defaultMasterKey: "",
	lastOpts: {
		requireDigit: null,
		requirePunctuation: null,
		requireMixedCase: null,
		restrictSpecial: null,
		restrictDigits: null,
		hashWordSize: null,
//			restrictPunctuation: null,
		sha3: null
	},
	init: function init(url)
	{
			Object.defineProperty(window.HTMLLabelElement.prototype, "disabled",
			{
				get()
				{
					return this.hasAttribute("disabled");
				},
				set(val)
				{
					if (val)
					{
						this.setAttribute("disabled", "");
						this.firstChild.disabled = true;
					}
					else
					{
						this.removeAttribute("disabled");
						this.firstChild.disabled = false;
					}
				},
				configurable: false,
				enumerable: false
			});
;
		this.url = url;
//passHashCommon.global.pref("guessSiteTag", true);
//passHashCommon.global.pref("guessFullDomain", true);
//passHashCommon.global.pref("siteTagToMasterKey", true);
		passHashCommon.opts = Object.assign({}, passHashCommon.global.options);
		passHashCommon.opts.restrictSpecial = false;
		passHashCommon.opts.restrictDigits = false;
		if (passHashCommon.opts.restoreLast && passHashCommon.opts.lastOptions)
		{
			try
			{
				let opts = JSON.parse(passHashCommon.opts.lastOptions);
				for(let i in opts)
				{
					if (i in this.lastOpts)
					{
						passHashCommon.opts[i] = opts[i];
						this.lastOpts[i] = opts[i];
					}
				}
			}catch(e){console.log(e)};
		}
		let domainAll = passHashCommon.global.getDomain(url, true),
		    domainParts = Object.assign([], domainAll[1]),
		    _domain = domainAll[0].join("."),
		    domain,
				defaultSiteTag = "",
				data,
				subdomain;

let i = 10;
do
{
  domain = domainParts.join(".");
  data = Object.assign([], passHashCommon.global.list(domain));
  subdomain = domainParts.shift();
}
while(domain != _domain && !data.length && i--);
console.log(i, subdomain, data, _domain, domain, domainParts);
		passHashCommon.origData = {orig: Object.assign([], data), decrypted: null, encrypted: null};
		if (typeof(data[1]) == "object")
		{
			let p = "", r = "";
			try
			{
				p = XORCipher.decode(passHashCommon.global.SESSID, btoa(passHashCommon.global.encryptPass)).substr(passHashCommon.global.SESSID.length);
			}
			catch (e){log(e)}
			try
			{
				r = XORCipher.decode(p, data[1][0]);
			}
			catch (e){log(e)}

			data[1] = r;

			passHashCommon.origData.encrypted = (r === "");

		}
		passHashCommon.origData.decrypted = Object.assign([], data);
log(passHashCommon.origData);
		if (passHashCommon.opts.guessSiteTag && domain != null)
				defaultSiteTag = (passHashCommon.opts.guessFullDomain || passHashCommon.global.isIP(domain) ? domain : domain.split(".")[0]);

		if (passHashCommon.opts.siteTagToMasterKey && defaultSiteTag !== "")
				this.defaultMasterKey = " " + defaultSiteTag;

		ctlSiteTag.value = passHashCommon.opts.rememberSiteTag ? data[0] || defaultSiteTag : defaultSiteTag;
		ctlMasterKey.value = passHashCommon.opts.rememberMasterKey ? data[1] || this.defaultMasterKey : this.defaultMasterKey;
		passHashCommon.masterKeySaved = data[1];
		passHashCommon.siteTagSaved = data[0];
		let strDefOptions = (passHashCommon.masterKeySaved ? "" : passHashCommon.getOptionString()),
				strOptions = data[2] || strDefOptions;

		if (passHashCommon.origData.encrypted && passHashCommon.origData.decrypted[1] === "")
		{
			ctlMasterKey.setAttribute("encrypted", true);
			ctlMasterKey.setAttribute("placeholder", passHashCommon.global.i18n("encrypted"));
			ctlEncryptPass.setAttribute("placeholder", passHashCommon.global.i18n("decryptPassPlaceholder"));
		}
		passHashCommon.opts = Object.assign({}, passHashCommon.parseOptionString(strOptions))
		for(let i in passHashCommon.opts)
		{
			if (i == "encryptPass")
				continue;

			let opt = passHashCommon.opts[i],
					node = $(i);

			passHashCommon.opts[i] = opt;
			if (!node)
				continue;

			if (typeof(opt) == "boolean")
				node.checked = opt;
			else
				node.value = opt;

			let filter = null;
			if (i in passHashCommon.global.consts.OPTSDEFAULT)
			{
				if ("min" in passHashCommon.global.consts.OPTSDEFAULT[i])
					node.setAttribute("min", passHashCommon.global.consts.OPTSDEFAULT[i].min);

				if ("max" in passHashCommon.global.consts.OPTSDEFAULT[i])
					node.setAttribute("max", passHashCommon.global.consts.OPTSDEFAULT[i].max);

				if ("filter" in passHashCommon.global.consts.OPTSDEFAULT[i])
					filter = passHashCommon.global.consts.OPTSDEFAULT[i].filter;
			}
			node.addEventListener("input", function(e)
			{
				if (node.type == "checkbox")
					passHashCommon.opts[i] = node.checked;
				else
				{
					let val = node.value;
					if (node.type == "number")
					{
						val = ~~val;
						if (node.max && val > node.max)
							val = ~~node.max;

						if (node.min && val < node.min)
							val = ~~node.min;

					}
					passHashCommon.opts[i] = filter ? filter(val) : val;
					if (node.value !== "" + val)
					{
						let v = node.value;
						clearTimeout(node._phTimer);
						node._phTimer = setTimeout(function()
						{
							if (node.value === v)
								node.value = val;
						}, 1000);
					}
				}

				passHashCommon.update(false);
				if (["rememberMasterKey", "rememberSiteTag"].indexOf(i) >= 0)
					passHashCommon.global.pref(i, passHashCommon.opts[i]);

			}, false);
		}


		let that = this,
				firstCheckbox = 1;

log(passHashCommon.global.consts.OPTBITS.restrictPunctuationLegacy.toString(2));
log(passHashCommon.opts.restrictPunctuation.toString(2));
		if (!data.length)
			passHashCommon.opts.restrictPunctuation = passHashCommon.opts.sha3 ? 1 : 0;

log(data);
log(passHashCommon.opts.restrictPunctuation.toString(2));

		for (let i = 1; i < 31; i++)
		{
			let checkbox = document.createElement("span");
			checkbox.id = "restrictPunctuation" + i;
			checkbox.className = "restrictPunctuation checkbox";
			checkbox.setAttribute("title", passHashCommon.punctuation[i-1]);
			checkbox.setAttribute("tabindex", 100+i);
			checkbox.innerText = String.fromCharCode(32 + i + (i > 15 ? i > 22 ? i > 27 ? 63 : 36 : 10 : 0));
			Object.defineProperty(checkbox, "checked",
			{
				get()
				{
					return this.hasAttribute("checked");
				},
				set(val)
				{
					if (val)
						this.setAttribute("checked", true);
					else
						this.removeAttribute("checked");
				}
			});
			if (i > 15)
				checkbox.className += " extra";

//log(i, (i <= 15 || (i > 15 && !(passHashCommon.opts.restrictPunctuation & 1))), passHashCommon.opts.restrictPunctuation, !(passHashCommon.opts.restrictPunctuation & 1));

			if (!(passHashCommon.opts.restrictPunctuation >> i & 1))
				if (i <= 15 || (i > 15 && passHashCommon.opts.restrictPunctuation & 1))
					checkbox.checked = true;

			checkbox.addEventListener("click", function(e)
			{
				return;
log("click");
				this.checked = !this.checked;
				if (!e.shiftKey || !firstCheckbox)
					firstCheckbox = i;

				else if (firstCheckbox && i != firstCheckbox)
				{
					for(let c,v,n = i > firstCheckbox ? firstCheckbox+1 : i; n < (i < firstCheckbox ? firstCheckbox : i + 1); n++)
					{
						c = $("restrictPunctuation" + n),
						v = $("restrictPunctuation" + firstCheckbox).checked;
						c.checked = v;
					}
				}
				let r = passHashCommon.restrictPunctuationGet();
				if (this.checked)
					r &= ~(1 << i);
				else
				{
					r |= 1 << i;
					if (r == passHashCommon.global.consts.OPTBITS.restrictPunctuation - 1)
					{
						r = passHashCommon.opts.restrictPunctuation;
						this.checked = true;
					}
				}
				if (r == (passHashCommon.global.consts.OPTBITS.restrictPunctuation ^ passHashCommon.global.consts.OPTBITS.restrictPunctuationLegacy))
					r = 0;
				else if (r != passHashCommon.global.consts.OPTBITS.restrictPunctuationLegacy)
					r |= 1;

				if (r & 1)
					passHashCommon.opts.sha3 = true;

				passHashCommon.opts.restrictPunctuation = r
				passHashCommon.update();
				this.focus();
			}, false);
			ctlRestrictPunctuation.appendChild(checkbox);
		}
		let first = null, checked, changed, last, lastFocused;
		document.addEventListener("mousedown", function(e)
		{
		  lastFocused = document.activeElement;
			first = (e.target.id.match(/^restrictPunctuation([0-9]+)$/)||0)[1] || null;
			checked = !e.target.checked;
log("mousedown", e, first);
			if (first)
			{
				e.target.setAttribute("_checked", checked);
				log(e.target.getAttribute("_checked"))
			}
		}, true);

		ctlRestrictPunctuation.addEventListener("mouseover", function(e)
		{
			if (!first)
				return;

			let id = (e.target.id.match(/^restrictPunctuation([0-9]+)$/) || 0)[1];
			if (!id)
				return;

			for(let i = 1; i < 31; i++)
			{
				let checkbox = $("restrictPunctuation" + i);
				if ((i < first && i < id) || (i > first && i > id))
				{
					checkbox.removeAttribute("_checked");
					continue;
				}
				if (checkbox.getAttribute("_checked") != checked)
					changed = true;

				checkbox.setAttribute("_checked", checked);
			}
			last = e.target;
		}, false);

		document.addEventListener("mouseup", function(e)
		{
log("mouseup", e.target);
			let changed = false;
			for(let i = 1; i < 31; i++)
			{
				let obj = $("restrictPunctuation" + i),
						c = obj.getAttribute("_checked");
				if (c !== null && c !== "")
				{
					obj.removeAttribute("_checked");
					obj.checked = c == "true";
					changed = true;
				}
			}
			if (changed)
			{
				let r = passHashCommon.restrictPunctuationGet();
log("changed", r);
				if (r == passHashCommon.global.consts.OPTBITS.restrictPunctuation - 1)
				{
					last.checked = true;
					r = passHashCommon.restrictPunctuationGet();
				}
				r |= 1;
log(r);
				passHashCommon.opts.restrictPunctuation = r
				passHashCommon.update();
			}
			first = changed = null;
			e.target.focus();
		}, false);


		if (!ctlMasterKey.value || ctlMasterKey.value === this.defaultMasterKey)
		{
			if (passHashCommon.opts.masterKeyAddTag && ctlSiteTag.value)
				ctlMasterKey.value = this.defaultMasterKey;

			ctlMasterKey.setSelectionRange(0,0);
		}
		else
		{
			ctlMasterKey.select();
		}
		(ctlSiteTag.value === "" ? ctlSiteTag : ctlMasterKey).focus();


		passHashCommon.updateHashWord();
		passHashCommon.hashWordSaved = passHashCommon.hashWord;
		passHashCommon.masterKeyInitial = ctlMasterKey.value;
		passHashCommon.siteTagInitial = ctlSiteTag.value;
		for(let i in this.lastOptions)
		{
			this.defaultOptions[i] = this[i];
		}
		ctlMasterKey.addEventListener("input", passHashCommon.updateHashWord, false);
		ctlMasterKey.addEventListener("keyup", passHashCommon.onKeyUp, false);
		ctlSiteTag.addEventListener("input", passHashCommon.updateHashWord, false);
		ctlSiteTag.addEventListener("keyup", passHashCommon.onKeyUp, false);
		ctlSiteTag.addEventListener("input", passHashCommon.updateHashWord, false);
		$("bump").addEventListener("click", passHashCommon.onBumpSiteTag.bind(passHashCommon), false)
//		$("unmask").addEventListener("input", passHashCommon.onUnmask.bind(passHashCommon), false);
		$("options").addEventListener("click", passHashCommon.onOptions.bind(passHashCommon), false);
		$("accept").addEventListener("click", this.onAccept.bind(this), false);
		$("cancel").addEventListener("click", window.close.bind(window), false);
		ctlEncryptPass.addEventListener("input", passHashCommon.updateHashWord, false);
		ctlEncryptPass.addEventListener("keyup", passHashCommon.onKeyUp, false);
		$("encryptSubmit").addEventListener("click", passHashCommon.onEncryptSubmit.bind(passHashCommon), false);
		$("hashWordSize").addEventListener("keyup", passHashCommon.onKeyUp, false);
		ctlHashWord.addEventListener("dblclick", passHashCommon.selectHashWord, false);
		ctlHashWord.addEventListener("copy", passHashCommon.onCopy, false);
		$("copy").addEventListener("click", passHashCommon.onCopy, false);
		ctlSha3.addEventListener("click", passHashCommon.onSha3, false);
		ctlSave.addEventListener("click", passHashCommon.onSaveDelete, false);
		ctlDelete.addEventListener("click", passHashCommon.onSaveDelete, false);
		ctlHashWord.addEventListener("context", passHashCommon.selectHashWord, false);
		let showPassNodes = document.querySelectorAll("[showpass]");
		for (let i = 0; i < showPassNodes.length; i++)
		{
			let node = showPassNodes[i],
					span = document.createElement("span"),
					spanBox = document.createElement("span"),
					name = node.id.charAt(0).toUpperCase() + node.id.slice(1),
					reveal = "reveal" + name;
log(reveal);
			spanBox.className = "showpassBox";
			span.className = "showpass";
//			span.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><defs/><path d="M12 9a3 3 0 013 3 3 3 0 01-3 3 3 3 0 01-3-3 3 3 0 013-3m0-4.5c5 0 9.27 3.11 11 7.5-1.73 4.39-6 7.5-11 7.5S2.73 16.39 1 12c1.73-4.39 6-7.5 11-7.5M3.18 12a9.821 9.821 0 0017.64 0 9.821 9.821 0 00-17.64 0z"/></svg>';
//			span = span.firstChild;
			span.addEventListener("click", function(e)
			{
				passHashCommon.opts[reveal] = !passHashCommon.global.pref(reveal, !passHashCommon.opts[reveal]);
				passHashCommon.onUnmask(false, name, passHashCommon.opts[reveal]);
				lastFocused.focus();
			}, false);
			span.addEventListener("mouseover", function(e)
			{
				passHashCommon.onUnmask(true, name, true);
				node.removeAttribute("type");
			}, false);
			span.addEventListener("mouseout", function(e)
			{
				passHashCommon.onUnmask(true);
			}, false);
			if (node.nextSibling)
				node.parentNode.insertBefore(span, node.nextSibling);
			else
				node.parentNode.appendChild(span);
//			spanBox.appendChild(node);
//			spanBox.appendChild(span);
		}
		document.addEventListener("click", function(e)
		{
//log(e);
		}, true);
		window.addEventListener("wheel", function(e)
		{
			if (!e.ctrlKey || e.altKey || e.shiftKey)
				return;

			e.preventDefault();
			passHashCommon.global.pref("fontSize", passHashCommon.global.pref("fontSize") + (e.deltaY < 0 ? 1 : -1));
			that.setSize();
		}, false);
		passHashCommon.updateOptionsVisibility();
log("focused", document.activeElement);
		passHashCommon.onUnmask();
log("focused", document.activeElement);
		this.setSize();

		let d = Object.assign([], domainAll[1]),
	      domLast = domainAll[0].join(".");

	  for(let i = 0, o, dom; i < domainAll[1].length; i++)
	  {
	    dom = d.join(".");
	    o = document.createElement("option");
	    o.value = dom;
	    o.textContent = dom;
	    ctlDomain.appendChild(o);
	    if (dom == domLast)
	      break;

	    d.shift();
	  }
		ctlDomain.value = domain;
		ctlDomain._value = domain;
		passHashCommon.optsOrig = Object.assign({}, passHashCommon.opts);
log("focused", document.activeElement);
	}, //init()

	setSize(size)
	{
		if (!size)
			size = passHashCommon.global.pref("fontSize");

		document.body.style.fontSize = size + "px";
		document.body.classList.toggle("resized", (size != passHashCommon.global.consts.OPTSDEFAULT.fontSize.default));
	},

	onAccept: function(e)
	{
		if (!passHashCommon.update())
			return false

		passHashCommon.opts.restrictPunctuation = passHashCommon.restrictPunctuationGet();

		if (!passHashCommon.opts.sha3)
			passHashCommon.opts.restrictPunctuation = 0;
		else
			passHashCommon.opts.restrictPunctuation |= 1;

log(passHashCommon.opts.restrictPunctuation, passHashCommon.opts.restrictPunctuation.toString(2));
		let domain = ctlDomain.value || passHashCommon.global.getDomain(this.url),
				strOptions = passHashCommon.getOptionString(),
				siteTag = passHashCommon.opts.rememberSiteTag ? ctlSiteTag.value : "",
				masterKey = passHashCommon.opts.rememberMasterKey && ctlMasterKey.value != this.defaultMasterKey ? ctlMasterKey.value : "",
				_masterKey = masterKey,
				ep = ctlEncryptPass.value || "",
				data = [siteTag, masterKey, strOptions],
				dataString = data.toString();
log(Object.assign({}, data));
log(passHashCommon.global.encryptPass);
log(btoa(passHashCommon.global.encryptPass));
		const encryptPass = XORCipher.decode(passHashCommon.global.SESSID, btoa(passHashCommon.global.encryptPass)).substr(passHashCommon.global.SESSID.length);

		if (!ep || ep === passHashCommon.global.encryptPass)
			ep = encryptPass;

		if (ep && encryptPass && ep !== encryptPass)
		{
log("master password does not match");
		}
		if (ep)
		{
			if (masterKey)
				masterKey = [XORCipher.encode(ep, masterKey)];

			passHashCommon.global.encryptPass = ep;
		}
		else if (passHashCommon.opts.sha3)
		{
			masterKey = "";
		}
log(ep, masterKey)
		data[1] = masterKey;
log(ep, passHashCommon.global.encryptPass);
log(Object.assign({}, data));
//					if (siteTag != this._data[0] || masterKey != this._data[1] || strOptions != this._data[2])
//					if ((this._data.length && (siteTag != this._data[0] || masterKey != this._data[1])) || this.masterKeyInitial != ctlMasterKey.value || this.siteTagInitial != ctlSiteTag.value)

		if (ctlDelete.checked)
		{
			passHashCommon.global.listRemove(domain);
			passHashCommon.origData.decrypted = [];
			passHashCommon.origData.orig = [];
		}

		if (ctlSave.checked
				&& (	(passHashCommon.origData.decrypted.length && passHashCommon.origData.decrypted.toString() != dataString)
							|| passHashCommon.masterKeyInitial != ctlMasterKey.value
							|| passHashCommon.siteTagInitial != ctlSiteTag.value))
		{
			passHashCommon.global.list(domain, data);
log(data);
log(Object.assign({}, passHashCommon.origData))

			passHashCommon.origData.decrypted = [data[0], _masterKey, data[2]];
			passHashCommon.origData.orig = Object.assign([], data);
			passHashCommon.origData.encrypted = typeof(masterKey) != "object";
log(Object.assign({}, passHashCommon.origData))
		}

		for(let i in this.lastOptions)
		{
			this.lastOptions[i] = passHashCommon.opts[i];
		}
		passHashCommon.global.pref("lastOptions", JSON.stringify(this.lastOptions));
		passHashCommon.global.insertPass(passHashCommon.hashWord);
		passHashCommon.update();
//		window.close();
	},//onAccept()

};//passhash
log("global");
passHashCommon.global = chrome.extension.getBackgroundPage() ? chrome.extension.getBackgroundPage().passHash : null;
const _ = passHashCommon.global.i18n.bind(passHashCommon.global);
passHashCommon.init18n(_);
/*
if (passHashCommon.global.opened)
	return window.close();
*/
passHashCommon.global.opened = true;

passHash._a = new Date();
window.addEventListener("unload", function()
{
	passHashCommon.global.opened = false;
}, false);

chrome.tabs.query({active:true,currentWindow:true}, function (tabs)
{
	passHash.init(tabs[0].url);
});


function messenger(msg, callback)
{
	if (callback !== undefined)
		return chrome.runtime.sendMessage(msg, callback);

	if (!messenger.port)
		return;

	messenger.port.postMessage(msg);
}
Object.defineProperties(messenger, {
	port:
	{
		get()
		{
			if (!this._port)
				this._port = chrome.runtime.connect({name: JSON.stringify(pageInfo.frames[pageInfo.id] ? pageInfo.frames[pageInfo.id].info : pageInfo.frames[pageInfo.id])});

			return this._port;
		},
		set(val)
		{
			this._port = val;
		},
		configurable: false,
		enumerable: false
	},
	_port:
	{
		value: "",
		configurable: false,
		enumerable: false,
		writable: true
	},
	addListener:
	{
		value: function(callback)
		{
			this.port.onMessage.addListener(callback);
		},
		configurable: false,
		enumerable: false,
		writable: false
	},
	removeListener:
	{
		value: function(callback)
		{
			this.port.onMessage.removeListener(callback);
		},
		configurable: false,
		enumerable: false,
		writable: false
	},
});
messenger("info", function(data)
{
log(data);
	data = data && data.info || {};
	Object.assign(pageInfo, data);
	messenger.addListener(function(data)
	{
log("popup onMessage " + pageInfo.id + " ", arguments);
	});
//	messenger("from iframe " + pageInfo.id);
});

/* Internationalization
inspired by
https://github.com/piroor/webextensions-lib-l10n 
https://stackoverflow.com/q/65074388
*/
!function(node)
{
	const i18nRegExp = /\${([^}]+)}/g,
				i18n = function(a, b){if (b == "rememberMasterKey") console.log(b, _(b));return _(b) || a},
				texts = document.evaluate('descendant::text()[contains(self::text(), "${")]',node,null,XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,null),
				attributes = document.evaluate('descendant::*/attribute::*[contains(., "${")]',node,null,XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,null);

	let i = texts.snapshotLength;
	while(node = texts.snapshotItem(--i))
		node.nodeValue = node.nodeValue.replace(i18nRegExp, i18n);

	i = attributes.snapshotLength;
	while(node = attributes.snapshotItem(--i))
		node.nodeValue = node.nodeValue.replace(i18nRegExp, i18n);

}(document);
log(passHashCommon.global);

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.remove('notloaded');
}, { once: true });
}()