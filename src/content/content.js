"use strict";
!function(exports)
{
let log = console.log.bind(console),
//		isFrame = window.top !== window.self,
		pageInfo = {id:-1,frames:{}};
//		iFrames = [],
//		iFrameIds = {};


/*

if (!isFrame)
{
	setTimeout(function()
	{
	let frames = window.frames;
	for(let i = 0; i < frames.length; i++)
	{
*/
//		log(window.location.href.replace(/^([^\/]+\/\/[^\/]+\/?).*/, "$1"), frames[i]);
/*		frames[i].postMessage("test", "*");
	}
	}, 3000);
}
*/
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
			{
				this._port = chrome.runtime.connect({name: JSON.stringify(pageInfo.frames[pageInfo.id] ? pageInfo.frames[pageInfo.id].info : pageInfo.frames[pageInfo.id])});
			}

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
	log(data);
		let cmd = data;
		if (typeof(data) == "object")
		{
			cmd = data.cmd;
			data = data.data;
		}
		switch(cmd)
		{
			case "pass":
				insertPass(data);
				break;
		}
	log("content onMessage " + pageInfo.id + " ", arguments);
	});
//	messenger("from iframe " + pageInfo.id);
});

function insertPass(pass)
{
	let fields = [document.activeElement]
	if (passHash._focused[passHash._focused.length-1])
		fields[fields.length] = passHash._focused[passHash._focused.length-1];

	for(let i = 0; i < fields.length; i++)
	{
		if (!("value" in fields[i]))
			continue;

		fields[i].value = pass;
		fields[i].focus();
		fields[i].select();
		setTimeout(function()
		{
			fields[i].dispatchEvent(new Event('input', {view: window, bubbles: true, cancelable: true}));
			fields[i].dispatchEvent(new Event('change', {view: window, bubbles: true, cancelable: true}));
			fields[i].dispatchEvent(new Event('keyup', {view: window, bubbles: true, cancelable: true}));
			fields[i].dispatchEvent(new Event('click', {view: window, bubbles: true, cancelable: true}));
		});
		break;
	}
}
function onMutation (mutations, observer)
{
	for (let i = 0; i < mutations.length; i++)
	{
		findInput(mutations[i].addedNodes);
//		findFrames(mutations[i].addedNodes);
	}
}

function findInput(nodes)
{
	if (typeof(nodes) != "object")
		nodes = document.querySelectorAll('input[type="password"]');

	for(let i = 0; i < nodes.length; i++)
	{
		let node = nodes[i];
		if (node.nodeName == "INPUT" && node.type == "password")
		{
			passHash.attachMarkers(node);
		}
		else if (node.children && node.children.length)
		{
			findInput(node.children);
//			findInput(node.querySelectorAll('input[type="password"]'));
		}
	}
}
/*function findFrames(nodes)
{
	return;
	if (typeof(nodes) != "object")
		nodes = window.frames;//document.querySelectorAll('iframe');

log(nodes);
	for(let i = 0; i < nodes.length; i++)
	{
		let node = nodes[i];
		try
		{
			node.addEventListener("load", function(e)
			{
log(node, e);
//				node.postMessage(JSON.stringify({id:chrome.runtime.id,frameIndex:iFrames.length - 1}), "*")
//				iFrames[iFrames.length] = node;
			}, { once: true });
		}catch(e){log(e)}
	}
}
*/
function getOrigin(url)
{
	return url.replace(/^([^\/]+\/\/[^\/]+\/?).*/, "$1");
}
function findAllFields(nodes)
{
	requestAnimationFrame(findInput);
//	requestAnimationFrame(findFrames);
	log("findAllFields", arguments);
}

/*
// Grab options from storage
chrome.storage.local.get('sync').then(results => {
    var area = results.sync ? chrome.storage.sync : chrome.storage.local;
    area.get('options').then(function(data)
    {
    	passHash.options = data.options;
    	
log("options", data);
        // run on initial page content after we've gotten settings
//        requestAnimationFrame(findAllFields);
        // only start observing document for changes when we've gotten
        // settings from storage
        observer.observe (document, { childList: true, subtree: true });
    });
});
*/
/*
// Register for storage changes to update maskkey when necessary
chrome.storage.onChanged.addListener(function (changes, areaName) {
log("onChange", arguments);
    if ('options' in changes) {
        maskKey = changes.options.newValue.maskKey;
        if (showMaskButton !== changes.options.newValue.showMaskButton) {
            showMaskButton = changes.options.newValue.showMaskButton;
            if (debug) console.log("[passwordhasherplus] showMaskButton changed: " + showMaskButton);
            requestAnimationFrame(findAllFields);
        }
        if (maskKey !== changes.options.oldValue.maskKey) {
            if (debug) console.log("[passwordhasherplus] mask key changed from " + changes.options.oldValue.maskKey + " to " + maskKey);
        }
    }
});
*/
let observer = new MutationObserver(onMutation);
let passHash = {
	markerNumber: 1,
	consts: {},
	options: {},
	bits:
	{
		showMarker: 16,
		showUnmask: 32,
		get size()
		{
			let i = 1;
			do
			{
				i++;
				if (!(this.showUnmask >> i))
					return i;
			}
			while (i < 32);
		}
	},

	get markerBits()
	{
		return this.options.markerPosition | (this.options.showMarker ? this.bits.showMarker : 0) | (this.options.showUnmask ? this.bits.showUnmask : 0) | this.options.markerSize << this.bits.size
	},

	_focused: [],
	focused: function(node)
	{
		this._focused.splice(this._focused.indexOf(node), 1);
		this._focused[this._focused.length] = node;

//		log(this._focused);
	},//focused()

	attachMarkers: function(field, force)
	{
		let bits = this.markerBits;

//log("bits", this.options.markerPosition, this.options.showMarker, this.options.showUnmask, this.options.markerSize, field._phInited, bits);
		if (field._phInited == bits && !force)
			return;

		let doc = field.ownerDocument,
				win = doc.defaultView,
				that = this;

		if (field._phInited === undefined)
		{
			field.addEventListener("focus", function(e)
			{
				that.focused(field);
			}, false);
			this.focused(field);
		}
		if (field._phInited && field._phInited != bits)
		{
			let node = doc.getElementById("passhashMarkers" + field.dataset.passHashMarkers);
			if (node)
			{
				node.parentNode.removeChild(node);
				if (field.__style)
					field.setAttribute("style", field.__style);
			}
		}
		field._phInited = bits;
		window._phMarkerBits = bits;
		field.__style = field.getAttribute("style");

		let markers = '<span class="passHashMarkers"><span class="passHashMarker">#</span><span class="passHashUnmask">*</span></span>',
				nodeBox = new DOMParser().parseFromString(markers, "text/html").lastChild.lastChild.firstChild,
				nodeMarker = nodeBox.firstChild,
				nodeUnmask = nodeBox.lastChild,
				nodesNum = (this.options.showMarker ? 1 : 0) + (this.options.showUnmask ? 1 : 0);

		nodeBox.id = "passhashMarkers" + this.markerNumber;
		this.setStyle(nodeBox, {
			margin: 0,
			display: "table",
			"border-spacing": "0",
			"border-collapse": "collapse",
		//	"background-color": "red",
			border: 0,
			padding: 0,
			position: "relative",
			"pointer-events": "all",
			"z-index": window.getComputedStyle(field).zIndex || 9,
			visibility: "visible",
			"line-height": "0",
			height: (this.options.markerSize + 2) + "px",
			bottom: 0,
			left: 0,
			right: 0,
			float: "inline-start",
			"max-width": (this.options.markerSize * 2 + 6) + "px",
			overflow: "hidden"
		}, 0, true);

		nodeMarker.id = "passhash_marker_" + this.markerNumber;
		nodeMarker.setAttribute("title", "Password Hasher");

		nodeUnmask.id = "passhash_unmask_" + this.markerNumber;
		nodeUnmask.setAttribute("title", "Show password");
		passHash.setMarkerStyle(nodeMarker, undefined, {
			display: this.options.showMarker ? "inline-block" : "none",
			margin: 0,
			font: passHash.options.markerSize + "px/1.1 fixed"
		}, undefined, true);
		passHash.setMarkerStyle(nodeUnmask, undefined, {
			margin: this.options.showMarker ? "0 0 0 2px" : 0,
			display: this.options.showUnmask && (!(passHash.options.markerPosition & passHash.consts.COMPACT) || !this.options.showMarker) ? "inline-block" : "none",
			"vertical-align": "middle",
			font: passHash.options.markerSize + "px/1.4 fixed"
		}, undefined, true);
		nodeBox.addEventListener("mouseenter", this.onEvent, false);
		nodeBox.addEventListener("mouseleave", this.onEvent, false);
		nodeMarker.addEventListener("mouseenter", this.onEvent, false);
		nodeMarker.addEventListener("mouseleave", this.onEvent, false);
		nodeUnmask.addEventListener("mouseenter", this.onEvent, false);
		nodeUnmask.addEventListener("mouseleave", this.onEvent, false);
		nodeBox.addEventListener("mousedown", this.onEvent, true);
		nodeBox.addEventListener("contextmenu", this.onEvent, false);
		//field.parentNode.insertBefore(nodeBox, field.nextSibling);
		field.parentNode.appendChild(nodeBox);
		let func = function()
		{
			let rectField = field.getBoundingClientRect(),
					rectBox = nodeBox.getBoundingClientRect();

			if (!rectField.width || !rectField.height)
				return false


			let top = 2 + rectField.bottom - rectBox.top,
					left = rectField.left - rectBox.left;

			if (field._phStyleBackup)
			{
				field.style.paddingLeft = field._phStyleBackup.paddingLeft;
				field.style.paddingRight = field._phStyleBackup.paddingRight;
				if (field._phStyle)
				{
					field._phStyle["padding-left"] = field._phStyleBackup.paddingLeft;
					field._phStyle["padding-right"] = field._phStyleBackup.paddingRight;
				}
			}
			if (rectField.width > rectBox.width + 20 && !(passHash.options.markerPosition & passHash.consts.BOTTOM))
			{
				let rf = rectField,
						rt = rectBox,
						type = passHash.options.markerPosition & passHash.consts.LEFT ? "left" : "right";

				if (!(passHash.options.markerPosition & passHash.consts.OUTSIDE))
				{
					if (field._phStyle)
						field._phStyle["padding-" + type] = (rectBox.width + 4) + "px";

					that.setStyle(field, "padding-" + type, (rectBox.width + 4) + "px");
					rectField = field.getBoundingClientRect();
					if (rectField.width > rf.width)
					{
						that.setStyle(field, {width: (rf.width - (rectField.width - rf.width)) + "px"});
					}
				}
				rectField = field.getBoundingClientRect();
				rectBox = nodeBox.getBoundingClientRect();
				top = (rectField.bottom - rectBox.top) - (rectField.height/2 + rectBox.height/2);
				if (passHash.options.markerPosition & passHash.consts.LEFT)
				{
					left = rectField.left - rectBox.left + 3 - (passHash.options.markerPosition & passHash.consts.OUTSIDE ? rectBox.width + 3 : 0);
				}
				else
				{
					left = rectField.right - rectBox.left - rectBox.width - 3 + (passHash.options.markerPosition & passHash.consts.OUTSIDE ? rectBox.width + 3 : 0);
				}
			}
			else if (passHash.options.markerPosition == (passHash.consts.BOTTOM | passHash.consts.RIGHT)
						|| passHash.options.markerPosition == (passHash.consts.BOTTOM | passHash.consts.RIGHT | passHash.consts.COMPACT))
			{
				left = rectField.right - rectBox.left - rectBox.width - 3;
			}
			that.loopRemove(func);
			that.setStyle(nodeBox, {top: top + "px", left: left + "px"});
			return true
		}
		if (!func())
			this.loopAdd(func);

		field.dataset.passHashMarkers = this.markerNumber;
		this.markerNumber++;
	}, //attachMarkers()

	onEvent: function(e)
	{
		let nodeBox = e.target.className == "passHashMarkers" ? e.target : e.target.parentNode;
		switch (e.type)
		{
			case "mouseenter":
				clearTimeout(nodeBox._phTimer);
				if (e.target == nodeBox)
				{
					if (!passHash.options.showMarker || !passHash.options.showUnmask || !(passHash.options.markerPosition & passHash.consts.COMPACT))
						return;

					if (!nodeBox.__phStyleBackup)
						nodeBox.__phStyleBackup = nodeBox.lastChild.getAttribute("style");

					passHash.setStyle(nodeBox.lastChild, "display", "inline-block")
				}
				else
				{
					e.target.classList.toggle("hover", true);
					passHash.setMarkerColor(e.target);
				}
				break;

			case "mouseleave":
				if (e.target != nodeBox)
				{
					e.target.classList.toggle("hover", false);
					passHash.setMarkerColor(e.target);
					delete e.target._phBG
				}
				if (!nodeBox.__phStyleBackup)
					return;

				clearTimeout(nodeBox._phTimer);
				nodeBox._phTimer = setTimeout(function()
				{
					nodeBox.lastChild.setAttribute("style", nodeBox.__phStyleBackup)
					passHash.setMarkerColor(nodeBox.lastChild);
				}, 500);
				break;

			case "mousedown":
				if (e.button != 1)
					return;
			case "contextmenu":
				passHash.setStyle(nodeBox, "z-index", "-9999");
				e.stopPropagation();
				e.preventDefault();
				e.stopImmediatePropagation();
				setTimeout(function()
				{
					passHash.setStyle(nodeBox, "z-index", 9);
				}, 10000);
				break;

		}
	},

	checkMarkerClick: function(event)
	{
		const node = event.target;
		// Looking for a left-click and one of our markers
		if (event.button == 0 && node)
		{
			const textNode = passHash.getMarkerTarget(node);
			if (textNode != null)
			{
				if (passHash.isMarker(node, "unmask"))
				{
					passHash.toggleMask(textNode);
					return false;   // handled
				}
			}
		}
		return true;    // Not handled
	},

	isMarker: function(node, tag)
	{
			try
			{
					if ((node.tagName == "TD" || node.tagName == "SPAN") && node.id.toString().indexOf("passhash_"+tag) >= 0)
						return node
					else if (node.parentNode)
						return this.isMarker(node.parentNode, tag);
			}
			catch(e) {}
			return false;
	},

	setStyle: function(node, style, value, clear)
	{
		if (!node)
			return;

		if (!node._phStyle)
		{
			if (!node._phStyleOrig)
			{
				let s = window.getComputedStyle(node);
				node._phStyleOrig = {};
				for(let i in s)
				{
					node._phStyleOrig[i] = s[i];
				}

			}
			if (!node._phStyleBackup)
			{
				node._phStyleBackup = {};
				for(let i in node.style)
				{
					if (typeof(node.style[i]) == "string")
						node._phStyleBackup[i] = node.style[i];
				}
			}
		}
		if (typeof(style) == "object")
		{
			let list = {};
			if (clear)
			{
				let s = window.getComputedStyle(node);
				for(let i = 0; i < s.length; i++)
				{
					list[s[i]] = (s[i] in style) ? style[s[i]] : "initial";
				}
			}
			list = Object.assign(list, style);

			for (let i in list)
			{
				passHash.setStyle(node, i, list[i]);
			}
			return;
		}
		node.style.setProperty(style, value, "important");
	},

	setMarkerStyle: function(node, clicked, style, size, clear)
	{
		size = typeof(size) == "undefined" ? this.options.markerSize + "px" : size;
		if (typeof(style) != "object")
			style = {};

		if (!node._phStyle)
			node._phStyle = Object.assign({
				border: "thin solid #80c080",
//	        	margin: 0,
				padding: 0,
//	        	font: size + "/1 fixed",
				color: "#609060",
				cursor: "pointer",
				"min-width": size,
				"max-width": size,
				"min-height": size,
				"max-height": size,
				"height": size,
				"width": size,
				"text-align": "center",
				"display": "inline-block",
				"-moz-user-select": "none",
				"user-select": "none",
				"vertical-align": "middle"
			}, style)
		this.setStyle(node, node._phStyle, 0, clear);

		if (clicked !== undefined)
			node.classList.toggle("active", clicked);

		this.setMarkerColor(node);
		node._phBG = node.style.backgroundColor;
	},

	setMarkerColor: function(node)
	{
		let color = ["#eeffee", //default
								 "#9DD09D", //active
								 "#B0EAAA", //hover
								 "#B5DBB5"];//hover active
		
		this.setStyle(node, "background-color", color[(node.classList.contains("active") ? 1 : 0) + (node.classList.contains("hover") ? 2 : 0)]);
	},

	getMarkerTarget: function(node)
	{
	  node = node || node.parentNode || node.parentNode.parentNode;
		if (node)
			return document.querySelector('[data-pass-hash-markers="' + node.id.replace(/[\D]+/, '') + '"]');

		return null;
	},

	getTargetMarker: function(node, tag)
	{
		if (node)
			return node.ownerDocument.getElementById("passhash_" + tag + "_" + node.dataset.passHashMarkers);
		return null;
	},

	toggleMask: function(textNode)
	{
			var marker = passHash.getTargetMarker(textNode, "unmask");

			if (textNode.type == "password")
			{
					let s = window.getComputedStyle(textNode);
					textNode._phComputedStyle = {};
					textNode._phStyle = {};
					for(let i = 0; i < textNode.style.length; i++)
					{
						textNode._phComputedStyle[textNode.style[i]] = s[textNode.style[i]];
						textNode._phStyle[textNode.style[i]] = textNode.style[textNode.style[i]];
					}
					if (marker != null)
							passHash.setMarkerStyle(marker, true);


					textNode.setAttribute("type", "text");
					for(let i in textNode._phComputedStyle)
					{
						textNode.style.setProperty(i, textNode._phComputedStyle[i], "important");
					}
			}
			else
			{
					if (marker != null)
							passHash.setMarkerStyle(marker, false);
					textNode.setAttribute("type", "password");

					for(let i in textNode._phStyle)
					{
						textNode.style.setProperty(i, textNode._phStyle[i]);
					}
			}
	},

	_loopList: [],
	_loopTimer: null,
	loopAdd: function(func)
	{
		if (passHash._loopList.indexOf(func) == -1)
		{
			passHash._loopList[passHash._loopList.length] = func;
		}
		if (passHash._loopTimer === null)
			passHash._loopTimer = setInterval(passHash.loop, 300);

		return passHash._loopList.length;
	},

	loopRemove: function(func)
	{
		let i = typeof(func) == "function" ? passHash._loopList.indexOf(func) : func;
		if (passHash._loopList[i])
			passHash._loopList[i] = null;
	},

	loop: function()
	{
		for(let i = 0; i < passHash._loopList.length; i++)
		{
			if (passHash._loopList[i] === null)
			{
				passHash._loopList.splice(i, 1);
				--i;
				continue;
			}

			if (passHash._loopList[i])
			{
				try
				{
					passHash._loopList[i]();
				}
				catch(e)
				{
					passHash.loopRemove(passHash._loopList[i]);
				}
			}
		}
		if (!passHash._loopList.length)
		{
			clearInterval(passHash._loopTimer);
			passHash._loopTimer = null;
		}
	},
}//passhash

window.addEventListener("message", function(e)
{
	let data = null;
	try
	{
		data = JSON.parse(e.data);
	}catch(err){/*log(e, err)*/}
	if (!data || data.id != chrome.runtime.id)
		return;

	if ("getpass" in data)
	{
		if (document.activeElement.tagName == "IFRAME")
		{
			document.activeElement.contentWindow.postMessage(JSON.stringify({id:chrome.runtime.id,getpass:""}), "*");
		}
		else
			messenger({cmd: "getpass", data: pageInfo.id},function(data)
			{
				insertPass(data.getpass);
			});
	}
//log(event.data, event.origin, getOrigin(window.location.href));
}, false);


setTimeout(function()
{
messenger("consts", function(data)
{
	if (!data)
		return;

	Object.assign(passHash.consts, data.consts);
			
});

messenger("options", function(data)
{
log(data);
	if (!data)
		return;

	Object.assign(passHash.options, data.options);
	
	findAllFields();
	observer.observe (document, { childList: true, subtree: true });
});
}, 100);
window.addEventListener("click", passHash.checkMarkerClick, true);
//log("content", new Date(), isFrame);

chrome.storage.onChanged.addListener(function (data, type)
{
log("onChange", arguments);
	if ("options" in data)
	{
		Object.assign(passHash.options, data.options.newValue);
		requestAnimationFrame(findInput);
	}
});

//exports.passHash = passHash;
}(this)
