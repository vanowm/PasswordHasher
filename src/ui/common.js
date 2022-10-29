"use strict";

const $ = function(id){return document.getElementById(id)}

var ctlSiteTag							= $("siteTag"),
		ctlMasterKey						= $("masterKey"),
		ctlHashWord							= $("hashWord"),
		ctlRestrictPunctuation	= $("restrictPunctuation"),
		ctlSha3									= $("sha3"),
		ctlAccept								= $("accept"),
		ctlEncryptPass					= $("encryptPass"),
		ctlSave									= $("save"),
		ctlDelete								= $("delete"),
		ctlRememberMasterKey		= $("rememberMasterKey"),
		ctlDomain               = $("domain")

		;

!function(exports)
{
		let log = console.log.bind(console),
		_ = function(){};

let passHashCommon = {
	global: {},
	opts: {},
	// IMPORTANT: This function should be changed carefully.  It must be
	// completely deterministic and consistent between releases.  Otherwise
	// users would be forced to update their passwords.  In other words, the
	// algorithm must always be backward-compatible.  It's only acceptable to
	// violate backward compatibility when new options are used.
	// SECURITY: The optional adjustments are positioned and calculated based
	// on the sum of all character codes in the raw hash string.  So it becomes
	// far more difficult to guess the injected special characters without
	// knowing the master key.
	// TODO: Is it ok to assume ASCII is ok for adjustments?
	generateHashWord: function(opt)
	{
		let siteTag = opt.siteTag,
				masterKey = opt.masterKey,
				hashWordSize = opt.hashWordSize,
				restrictDigits = opt.restrictDigits,
				requirePunctuation = opt.requirePunctuation,
				requireMixedCase = opt.requireMixedCase,
				restrictSpecial = opt.restrictSpecial,
				requireDigit = opt.requireDigit,
				restrictPunctuation = opt.restrictPunctuation,
				sha3 = opt.sha3;
			// Start with the SHA1-encrypted master key/site tag.
			var s;
			if (sha3 || hashWordSize > 26)
			{
				let o = Object.assign({}, opt);
				if (restrictDigits)
				{
					delete o.requirePunctuation;
					delete o.requireMixedCase;
					delete o.requireDigit;
					delete o.restrictPunctuation;
					delete o.restrictSpecial;
				}
				if (restrictSpecial)
				{
					delete o.requirePunctuation;
					delete o.restrictPunctuation;
				}
				s = btoa(this.global.sha3(JSON.stringify(o)));
//				s = btoa(this.global.sha3(masterKey, siteTag, hashWordSize));
			}
			else
			{
				s = b64_hmac_sha1(masterKey, siteTag);
			}


			// Use the checksum of all characters as a pseudo-randomizing seed to
			// avoid making the injected characters easy to guess.  Note that it
			// isn't random in the sense of not being deterministic (i.e.
			// repeatable).  Must share the same seed between all injected
			// characters so that they are guaranteed unique positions based on
			// their offsets.
			var sum = 0;
			for (var i = 0; i < s.length; i++)
					sum += s.charCodeAt(i);

			// Restrict digits just does a mod 10 of all the characters
			if (restrictDigits)
			{
					s = this.convertToDigits(s, sum, hashWordSize);
			}
			else
			{
					// Inject digit, punctuation, and mixed case as needed.
					if (requireDigit)
							s = this.injectSpecialCharacter(s, 0, 4, sum, hashWordSize, 48, 10);

					if (requirePunctuation && !restrictSpecial)
					{
							s = this.injectSpecialCharacter(s, 1, 4, sum, hashWordSize, 33, 15, restrictPunctuation);
log(restrictPunctuation, s);
					}
					else if (restrictPunctuation & 1)
					{
						s = s.replace(/[^a-zA-Z0-9]+/g, function(c, i, s)
						{
							let r = sum;
							do
							{
								r = r + c.charCodeAt(0) + i;
								r = Math.floor(r % 124);
							}
							while(!((r > 47 && r < 58) || (r > 64 && r < 91) || (r > 96 && r < 123)))
							return String.fromCharCode(r);
						});
					}
					if (requireMixedCase)
					{
							s = this.injectSpecialCharacter(s, 2, 4, sum, hashWordSize, 65, 26);
							s = this.injectSpecialCharacter(s, 3, 4, sum, hashWordSize, 97, 26);
					}
					// Strip out special characters as needed.
					if (restrictSpecial)
							s = this.removeSpecialCharacters(s, sum, hashWordSize);
			}
		 // Trim it to size.
			return s.substr(0, hashWordSize);
	},

	// This is a very specialized method to inject a character chosen from a
	// range of character codes into a block at the front of a string if one of
	// those characters is not already present.
	// Parameters:
	//  sInput   = input string
	//  offset   = offset for position of injected character
	//  reserved = # of offsets reserved for special characters
	//  seed     = seed for pseudo-randomizing the position and injected character
	//  lenOut   = length of head of string that will eventually survive truncation.
	//  cStart   = character code for first valid injected character.
	//  cNum     = number of valid character codes starting from cStart.

	injectSpecialCharacter: function(sInput, offset, reserved, seed, lenOut, cStart, cNum, filter)
	{
			var pos0 = seed % lenOut;
			var pos = (pos0 + offset) % lenOut;
			let isFilter = filter !== undefined && filter !== null,
					f, list = "";

			if (isFilter)
			{
				f = filter ^ this.global.consts.OPTBITS["restrictPunctuation" + (filter & 1 ? "" : "Legacy")];
//				f &= ~1;
				list = this.filter2string(f);
			}
			else
			{
				for(let i = 0; i < cNum; i++)
					list += String.fromCharCode(cStart + i);
			}
			// Check if a qualified character is already present
			// Write the loop so that the reserved block is ignored.
			for (var i = 0; i < lenOut - reserved; i++)
			{
					var i2 = (pos0 + reserved + i) % lenOut
					var c = sInput.charCodeAt(i2);
					if (c >= cStart && c < cStart + cNum)
					{
						if (isFilter && !list.match("\\" + sInput[i2]))
						{
							sInput = sInput.substr(0, i2) + list.substr(((seed + sInput.charCodeAt(pos)) % list.length), 1) + sInput.substr(i2+1);
						}

						return sInput;  // Already present - nothing to do
					}
			}
			var sHead   = sInput.substr(0, pos);
			var sInject = list.substr(((seed + sInput.charCodeAt(pos)) % list.length), 1);
			var sTail   = (pos + 1 < sInput.length ? sInput.substring(pos+1, sInput.length) : "");

			return sHead + sInject + sTail;
	},

	// Another specialized method to replace a class of character, e.g.
	// punctuation, with plain letters and numbers.
	// Parameters:
	//  sInput = input string
	//  seed   = seed for pseudo-randomizing the position and injected character
	//  lenOut = length of head of string that will eventually survive truncation.
	removeSpecialCharacters: function(sInput, seed, lenOut)
	{
			var s = '';
			var i = 0;
			while (i < lenOut)
			{
					var j = sInput.substring(i).search(/[^a-z0-9]/i);
					if (j < 0)
							break;
					if (j > 0)
							s += sInput.substring(i, i + j);
// https://github.com/wijjo/passhash/issues/3
					s += String.fromCharCode((seed + i + j) % 26 + 65);
//            s += String.fromCharCode((seed + i) % 26 + 65);
					i += (j + 1);
			}
			if (i < sInput.length)
					s += sInput.substring(i);
			return s;
	},
	// Convert input string to digits-only.
	// Parameters:
	//  sInput = input string
	//  seed   = seed for pseudo-randomizing the position and injected character
	//  lenOut = length of head of string that will eventually survive truncation.
	convertToDigits: function(sInput, seed, lenOut)
	{
			var s = '';
			var i = 0;
			while (i < lenOut)
			{
					var j = sInput.substring(i).search(/[^0-9]/i);
					if (j < 0)
							break;
					if (j > 0)
							s += sInput.substring(i, i + j);
// https://github.com/wijjo/passhash/issues/3
					s += String.fromCharCode((seed + sInput.charCodeAt(i)) % 10 + 48);
//            s += String.fromCharCode((seed + sInput.charCodeAt(i) + j) % 10 + 48);
					i += (j + 1);
			}
			if (i < sInput.length)
					s += sInput.substring(i);
			return s;
	},

	bumpSiteTag: function(siteTag)
	{
			var tag = siteTag.replace(/^[ \t]*(.*)[ \t]*$/, "$1");    // redundant
			if (tag)
			{
					var splitTag = tag.match(/^(.*):([0-9]+)?$/);
					if (splitTag == null || splitTag.length < 3)
							tag += ":1";
					else
							tag = splitTag[1] + ":" + (parseInt(splitTag[2]) + 1);
			}
			return tag;
	},

	onOptions: function()
	{
		this.opts.optionsHidden = !this.global.pref("optionsHidden", !this.opts.optionsHidden);
		this.updateOptionsVisibility();
	},

	updateOptionsVisibility: function()
	{
		$("optionsBox").hidden = this.opts.optionsHidden;
		$("options").innerText = this.global.i18n("options") + (this.opts.optionsHidden ? " ▲" : " ▼");
//		window.resizeTo(100,100);
	},

	parseOptionString: function(s)
	{
log("parse", s, this);
		if (typeof(s) == "number")
		{
			for(let i in this.global.consts.OPTBITS)
			{
				if (i == "restrictPunctuationLegacy")
					continue;

				if (i == "restrictPunctuation")
				{
					let m = ("" + s).match(/([0-9]+)([^0-9]([0-9]+))?/) || 0;
					this.opts[i] = ~~m[3];
				}
				else if (i == "hashWordSize")
					this.opts[i] = s & this.global.consts.OPTBITS[i];
				else
					this.opts[i] = s & this.global.consts.OPTBITS[i] ? true : false;
			}
		}
		else
		{
			this.opts.requireDigit       = (s.search(/d/i) >= 0);
			this.opts.requirePunctuation = (s.search(/p/i) >= 0);
			this.opts.requireMixedCase   = (s.search(/m/i) >= 0);
			this.opts.restrictSpecial    = (s.search(/r/i) >= 0);
			this.opts.restrictDigits     = (s.search(/g/i) >= 0);
			this.opts.restrictPunctuation  = 0;
			this.opts.sha3               = (s.search(/s/i) >= 0);
			var sizeMatch = s.match(/[0-9]+/);
			this.opts.hashWordSize = (sizeMatch != null && sizeMatch.length > 0
																	? ~~sizeMatch[0]
																	: 8);
		}
		return this.opts;
	},

	getOptionString: function()
	{
		let b = ~~this.opts.hashWordSize;
		for(let i in this.global.consts.OPTBITS)
		{
			if (i == "restrictPunctuationLegacy")
				continue;

			if (i == "restrictPunctuation")
			{
log("getOptionString", this.opts[i], passHashCommon.global.consts.OPTBITS.restrictPunctuationLegacy);
				if (!(this.opts[i] & 1))
					this.opts[i] = 0;

				if (this.opts[i])
					b += parseFloat("0." + this.opts[i]);
			}
			else if (i != "hashWordSize" && this.opts[i])
				b += this.global.consts.OPTBITS[i];
		}
		return b;
	},

	string2filter(str)
	{
		let r = 0;
		for(let i = 1; i < 31; i++)
		{
			if (str.indexOf(String.fromCharCode(32 + i + (i > 15 ? i > 22 ? i > 27 ? 63 : 36 : 10 : 0))) != -1)
				r |= 1 << i;

		}
log("string2filter", r);
		return r;
	},

	filter2string(filter)
	{
		let r = "";
		for(let i = 1; i < 31; i++)
		{
			if ((filter >> i) & 1)
				r += String.fromCharCode(32 + i + (i > 15 ? i > 22 ? i > 27 ? 63 : 36 : 10 : 0));
		}
//log("filter2string", r, filter, filter.toString(2), filter & 1);
		return r;
	},

	restrictPunctuationGet(f)
	{
		let r = 0;
		for (let i = 1; i < 31; i++)
		{
			if (!$("restrictPunctuation" + i).checked)
			{
				r |= 1 << i;
			}
		}
log("restrictPunctuationGet", r, r.toString(2), r & 1);
		return r
	},

	restrictPunctuationSet(val)
	{
		let isLegacy = val & 1;
		for (let i = 1; i < 31; i++)
		{
			$("restrictPunctuation" + i).checked = isLegacy && i < 16 || (!isLegacy && !(val >> i & 1));
		}
log("restrictPunctuationSet", val);
	},

	onSha3: function(e)
	{
		let that = passHashCommon;
		if (this.checked && that._sha3 === undefined)
		{
			that.opts.restrictPunctuation = 0;
			that.restrictPunctuationSet(that.opts.restrictPunctuation)
		}
		if (this.checked)
			that.opts.restrictPunctuation = that.restrictPunctuationGet() | 1;

		that._sha3 = this.checked;
	},

	updateCheckboxes: function(opt)
	{
		if (!ctlSha3.checked)
		{
		}
		if (this.opts.hashWordSize > 26)
		{
			if (ctlSha3.__checked === undefined)
				ctlSha3.__checked = ctlSha3.checked;

			ctlSha3.parentNode.disabled = true;
			ctlSha3.checked = true;
		}
		else
		{
			if (ctlSha3.__checked !== undefined)
			{
				ctlSha3.checked = ctlSha3.__checked;
				delete ctlSha3.__checked;
			}
			ctlSha3.parentNode.disabled = false;
		}
		this.opts.sha3 = ctlSha3.checked;
		if (!ctlSha3.checked)
		{
			passHashCommon.opts.restrictPunctuation = 0;
//			passHashCommon.restrictPunctuationSet(passHashCommon.opts.restrictPunctuation);
		}
		$("requireDigit").parentNode.disabled = this.opts.restrictDigits;
		$("requirePunctuation").parentNode.disabled = (this.opts.restrictSpecial || this.opts.restrictDigits);
/*		if (this.opts.restrictSpecial || this.opts.restrictDigits || !this.opts.requirePunctuation || !this.opts.sha3)
			ctlRestrictPunctuation.setAttribute("disabled", "");
		else
			ctlRestrictPunctuation.removeAttribute("disabled");
*/
		ctlRestrictPunctuation.disabled = this.opts.restrictSpecial || this.opts.restrictDigits || !this.opts.requirePunctuation || !this.opts.sha3 || !ctlSha3.checked;

		$("requireMixedCase").parentNode.disabled = this.opts.restrictDigits;
		$("restrictSpecial").parentNode.disabled = this.opts.restrictDigits;
		$("restrictDigits").parentNode.disabled = false;  // Can always add digits-only as a further restriction
		if (ctlSha3.checked && !passHashCommon.global.encryptPass && ctlEncryptPass.value === "")
		{
			if (!("__checked" in ctlRememberMasterKey))
				ctlRememberMasterKey.__checked = ctlRememberMasterKey.checked;

			ctlRememberMasterKey.checked = false;
			ctlRememberMasterKey.disabled = true;
			ctlRememberMasterKey.title = _("rememberMasterKey") + "*\n" + _("rememberMasterKeyOff");
			ctlRememberMasterKey.parentNode.title = ctlRememberMasterKey.title;
		}
		else
		{
			if ("__checked" in ctlRememberMasterKey)
			{
				ctlRememberMasterKey.checked = ctlRememberMasterKey.__checked;
				delete ctlRememberMasterKey.__checked
			}
			ctlRememberMasterKey.title = _("rememberMasterKey");
			ctlRememberMasterKey.parentNode.title = ctlRememberMasterKey.title;
			ctlRememberMasterKey.disabled = false;
			ctlDelete.checked = false;
		}

log("encryptPass", passHashCommon.global.encryptPass);
























/*
		if (ctlSha3.checked)
		{
log("c", passHashCommon.opts.restrictPunctuation.toString(2), passHashCommon._restrictPunctuation === undefined ? undefined : passHashCommon._restrictPunctuation.toString(2), passHashCommon._restrictPunctuation);
			if (passHashCommon._restrictPunctuation === undefined)
			{
				passHashCommon._restrictPunctuation = passHashCommon.opts.restrictPunctuation;
				passHashCommon.opts.restrictPunctuation = 0;
			}
			else if (!(passHashCommon._restrictPunctuation & 1))
			{
				passHashCommon.opts.restrictPunctuation = passHashCommon._restrictPunctuation;
//				delete passHashCommon._restrictPunctuation;
			}
			if (passHashCommon.opts.requirePunctuation)
				$("restrictPunctuation").removeAttribute("disabled");

log("d", passHashCommon.opts.restrictPunctuation.toString(2), passHashCommon._restrictPunctuation === undefined ? undefined : passHashCommon._restrictPunctuation.toString(2), passHashCommon._restrictPunctuation);
			passHashCommon.restrictPunctuationSet(passHashCommon.opts.restrictPunctuation);
		}
		else
		{
log("a", passHashCommon.opts.restrictPunctuation.toString(2), passHashCommon._restrictPunctuation === undefined ? undefined : passHashCommon._restrictPunctuation.toString(2), passHashCommon._restrictPunctuation);
			if (passHashCommon._restrictPunctuation !== undefined && !(passHashCommon._restrictPunctuation & 1))
				passHashCommon._restrictPunctuation = passHashCommon.opts.restrictPunctuation;

			passHashCommon.opts.restrictPunctuation = 1;
			$("restrictPunctuation").setAttribute("disabled", true);
			passHashCommon.restrictPunctuationSet(passHashCommon.opts.restrictPunctuation);
log("b", passHashCommon.opts.restrictPunctuation.toString(2), passHashCommon._restrictPunctuation === undefined ? undefined : passHashCommon._restrictPunctuation.toString(2), passHashCommon._restrictPunctuation);
		}

*/















log("opts", this.opts);

	},

	// Determines where to focus and generates the hash word when adequate
	// information is available.
	update: function(focus)
	{
		let r = this.updateHashWord();
log("update", r);
		if (focus === false)
			return true;
		switch (r)
		{
			case 1:
				ctlSiteTag.focus();
				return false;
			case 2:
				ctlMasterKey.focus();
				return false;
			case 3:
				ctlAccept.focus();
				return false;
		}
		ctlAccept.focus();
		return true;
	},

	onBlurSiteTag: function()
	{
		ctlSiteTag.value = ctlSiteTag.value.replace(/^[ \t]*(.*)[ \t]*$/, "$1");
	},

	onBumpSiteTag: function()
	{
		ctlSiteTag.value = this.bumpSiteTag(ctlSiteTag.value);
		this.update();
	},

	onUnmask: function(noupdate, name, _val)
	{
/*
			if ($("unmask").checked)
			{
					ctlSiteTag  .setAttribute("type", "");
					ctlMasterKey.setAttribute("type", "");
					ctlHashWord .value = this.hashWord;
					ctlHashWord.removeAttribute("type");
			}
			else
			{
					ctlSiteTag  .setAttribute("type", this.opts.revealSiteTag  ? "" : "password");
					ctlMasterKey.setAttribute("type", "password");
					ctlHashWord .value = this.opts.revealHashWord ? this.hashWord : this.hashWord.replace(/./g, "●");
					if (!this.opts.revealHashWord)
						ctlHashWord.setAttribute("type", "password");

			}
*/

			let l = name ? [name] : ["SiteTag", "MasterKey", "HashWord"];
			for(let i = 0; i < l.length; i++)
			{
				let node = window["ctl" + l[i]],
						val = _val === undefined ? this.opts["reveal" + l[i]] : _val;

					let s = node.selectionStart,
							e = node.selectionEnd;
				if (val || name)
					node.removeAttribute("type");
				else
					node.setAttribute("type", val ? "" : "password");

				if (node.tagName == "TEXTAREA")
				{

					node.value = val || name ? this.hashWord : this.hashWord.replace(/./g, "●");
				}
				node.classList.toggle("password", !this.opts["reveal" + l[i]]);
					node.selectionStart = s;
					node.selectionEnd = e;
			}
log(document.activeElement);
			if (!noupdate)
				this.update(false);
	},//onUnmask()

	setHashWord: function(txt)
	{
		this.hashWord = txt;
		this.onUnmask(true);
	},
	
	// Generate hash word if possible
	// Returns:
	//  0 = Hash word ok, but unchanged
	//  1 = Site tag bad or missing
	//  2 = Master key bad or missing
	//  3 = Hash word successfully generated
	updateHashWord: function()
	{
		let that = passHashCommon,
				masterKey = ctlMasterKey.value;

		that.updateCheckboxes();
		var r = 0;
		if (ctlSiteTag.value === "")
				r = 1;
		else if (ctlMasterKey.value === "")
				r = 2;

		document.body.classList.toggle("masterKeySaved", that.masterKeySaved && that.masterKeySaved == ctlMasterKey.value ? true : false);
		document.body.classList.toggle("siteTagSaved", that.siteTagSaved && that.siteTagSaved == ctlSiteTag.value ? true : false);
		document.body.classList.toggle("encryptPassSaved", that.global.encryptPass && ctlEncryptPass.value === "" ? true : false);
		document.body.classList.toggle("siteTagError", ctlSiteTag.value === "" ? true : false);
		document.body.classList.toggle("masterKeyError", ctlMasterKey.value === "" ? true : false);

		ctlEncryptPass.classList.toggle("saved", that.global.encryptPass && ctlEncryptPass.value === "" ? true : false);
		ctlMasterKey.classList.toggle("saved", that.masterKeySaved && that.masterKeySaved == ctlMasterKey.value ? true : false);
		ctlSiteTag.classList.toggle("saved", that.siteTagSaved && that.siteTagSaved == ctlSiteTag.value ? true : false);
		ctlSiteTag.classList.toggle("error", ctlSiteTag.value === "" ? true : false);
		ctlMasterKey.classList.toggle("error", ctlMasterKey.value === "" ? true : false);

		$("encryptSubmit").title = _(ctlEncryptPass.value === "" ? "encryptPassDelete" : "encryptPassSet");
//		$("bump").disabled = (!ctlSiteTag.value);
		$("copy").disabled = r;
		ctlAccept.disabled = r;
log(that.origData);
		ctlDelete.parentNode.hidden = !that.origData.orig.length;
		if (r)
		{
			that.setHashWord("");
			ctlHashWord.classList.toggle("saved", false);
			document.body.classList.toggle("hashWordSaved", false);
			return r;
		}
		// Change the hash word and determine whether or not it was modified.
		var hashWordOrig = that.hashWord;

		that.setHashWord(that.generateHashWord({
			siteTag:  ctlSiteTag.value,
			masterKey: ctlMasterKey.value,
			hashWordSize: that.opts.hashWordSize,
			requireDigit: that.opts.requireDigit,
			requirePunctuation: that.opts.requirePunctuation,
			requireMixedCase: that.opts.requireMixedCase,
			restrictSpecial: that.opts.restrictSpecial,
			restrictDigits: that.opts.restrictDigits,
			sha3: that.opts.sha3,
			restrictPunctuation: that.opts.restrictPunctuation
		}));
		let b = ((typeof(that.hashWordSaved) == "undefined" || that.hashWordSaved == that.hashWord) && that.masterKeySaved === ctlMasterKey.value && that.siteTagSaved === ctlSiteTag.value) ? true : false;
		document.body.classList.toggle("hashWordSaved", b);
		ctlHashWord.classList.toggle("saved", b);
		
		if ((that.hashWordSaved || typeof(that.hashWordSaved) == "undefined"))
		{
log(that.hashWordSaved);
log(that.origData);
			if (ctlHashWord.value !== ""
						&& (	(that.origData.decrypted.length
									&& (that.origData.decrypted.toString() != [ctlSiteTag.value, masterKey, that.getOptionString()].toString())
									&& masterKey !== ""
									&& ctlSiteTag.value !== "")
								|| (that.masterKeyInitial !== undefined
										&& that.masterKeyInitial != masterKey)
								|| (that.siteTagInitial !== undefined
										&& that.siteTagInitial != ctlSiteTag.value)
							)
//						|| (restrictPunctuation & 1 && !
			)
			{
				if ("__checked" in ctlSave)
				{
					ctlSave.checked = ctlSave.__checked;
					delete ctlSave.__checked
				}

				ctlSave.parentNode.disabled = false;
				ctlDelete.checked = false;
			}
			else
			{
				if (!("__checked" in ctlSave))
					ctlSave.__checked = ctlSave.checked;

				ctlSave.checked = false;
				ctlSave.parentNode.disabled = true;
			}
		}
log("hashOld", that.HashWord)
log("hashNew", hashWordOrig);
		if (that.hashWord != hashWordOrig)
				return 3;   // It was modified

		return 0;       // It was not modified
	},

	getEncryptPassHash: function(mp)
	{
		let hash = sha3_512.create();
		hash.update(mp);
		hash.update(mp.length + "");
		return hash.hex();
	},

	onKeyUp: function(e)
	{
		if (e.keyCode == 13)
		{
			e.preventDefault();
			switch(this.id)
			{
				case "encryptPass":
					$("encryptSubmit").click();
					break;
				default:
					ctlAccept.click();
			}
		}
		if (this.id == "encryptPass")
		{
log(passHashCommon.global.encryptPassCheck(this.value));
		}
	},

	onEncryptSubmit: function(e)
	{

		let ep = ctlEncryptPass.value;
		if (this.origData && this.origData.encrypted && ep !== "")
		{
			let s = XORCipher.decode(ep, this.origData.orig[1][0]);
			if (s !== "")
			{
				if (ctlMasterKey.value === "")
					ctlMasterKey.value = s;

				this.origData.encrypted = false;
				this.origData.decrypted[1] = s;
				this.masterKeyInitial = s;
				this.masterKeySaved = s;
				let opts = {opts:{siteTag:this.origData.decrypted[0],masterKey:this.origData.decrypted[1]},global:this.global};
				this.parseOptionString.apply(opts, [this.origData.decrypted[2]]);
				this.hashWordSaved = this.generateHashWord(opts.opts);
				ctlEncryptPass.setAttribute("placeholder", passHashCommon.global.i18n("encryptPassPlaceholder"));
			}
		}
		this.global.encryptPass = ep;
		ctlEncryptPass.value = "";
//		ctlEncryptPass.value = passHashCommon.global.encryptPass;
		this.updateHashWord()
	},

	get selectedHashword()
	{
		let isPass = ctlHashWord.hasAttribute("type"),
				st = ctlHashWord.selectionStart,
				en = ctlHashWord.selectionEnd;

			return isPass || st == en ? passHashCommon.hashWord : passHashCommon.hashWord.slice(st, en);
	},

	onCopy: function(e)
	{
		let that = passHashCommon,
				text = that.selectedHashword;

		if (that._timerFlash || !text)
			return;

		if (e.type == "copy")
			e.clipboardData.setData('text/plain', text);
		else
		{
			const el = document.createElement('textarea');
			el.value = text;
			el.setAttribute("readonly", "");
			el.style.position = 'absolute';
			el.style.top = '-999999px';
			document.body.appendChild(el);
			el.select();
			document.execCommand('copy');
			document.body.removeChild(el);
			ctlHashWord.select();
		}
log(text, e);
		e.preventDefault();
		ctlHashWord.classList.toggle("flash", true);
		that._timerFlash = setTimeout(function()
		{
			ctlHashWord.classList.toggle("flash", false);
			delete that._timerFlash;
		}, 1000);
	},

	selectHashWord: function(e)
	{
		e.target.select();
	},

	onSaveDelete: function(e)
	{
		if (!ctlSave.disabled && !ctlDelete.disabled)
			if (e.target === ctlSave)
			{
				if (ctlSave.checked)
					ctlDelete.checked = false;
			}
			else
			{
				if (ctlDelete.checked)
				ctlSave.checked = false;
			}
	},

  init18n: function(obj)
  {
    _ = passHashCommon._ = obj;
  },
	punctuation: [
		"Exclamation point",
		"Double quotes",
		"Number sign",
		"Dollar sign",
		"Percent sign",
		"Ampersand",
		"Single quote",
		"Opening parenthesis",
		"Closing parenthesis",
		"Asterisk",
		"Plus sign",
		"Comma",
		"Minus sign - hyphen",
		"Period",
		"Slash",
		"Colon",
		"Semicolon",
		"Less than sign",
		"Equal sign",
		"Greater than sign",
		"Question mark",
		"At symbol",
		"Opening bracket",
		"Backslash",
		"Closing bracket",
		"Caret - circumflex",
		"Underscore",
		"Opening brace",
		"Vertical bar",
		"Closing brace"
	]
} //passHashCommon
exports.passHashCommon = passHashCommon;
setTimeout(function()
{
	console.log(_);
	_ = passHashCommon._ = passHashCommon.global.i18n.bind(passHashCommon.global);
});
}(this);
