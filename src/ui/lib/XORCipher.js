// The Base64 algorithm is a modification of the one used in phpjs.org
// * http://phpjs.org/functions/base64_encode/
// * http://phpjs.org/functions/base64_decode/
//
// stringToUtf8ByteArray() and utf8ByteArrayToString()
// https://github.com/google/closure-library/blob/466a34e7e2d4cb49ac1c731347e845235d8ce7cc/closure/goog/crypt/crypt.js#L117-L143
// https://github.com/google/closure-library/blob/466a34e7e2d4cb49ac1c731347e845235d8ce7cc/closure/goog/crypt/crypt.js#L151-L178
//
// Copyright © 2013 Devin Weaver <suki@tritarget.org>
//
// This program is free software. It comes without any warranty, to
// the extent permitted by applicable law. You can redistribute it
// and/or modify it under the terms of the Do What The Fuck You Want
// To Public License, Version 2, as published by Sam Hocevar. See
// http://www.wtfpl.net/ for more details.

/* global _ */
(function(exports) {
	"use strict";

	function stringToUtf8ByteArray(str) {
		var out = [], p = 0;
		for (var i = 0; i < str.length; i++) {
			var c = str.charCodeAt(i);
			if (c < 128) {
				out[p++] = c;
			} else if (c < 2048) {
				out[p++] = (c >> 6) | 192;
				out[p++] = (c & 63) | 128;
			} else if (
					((c & 0xFC00) == 0xD800) && (i + 1) < str.length &&
					((str.charCodeAt(i + 1) & 0xFC00) == 0xDC00)) {
				// Surrogate Pair
				c = 0x10000 + ((c & 0x03FF) << 10) + (str.charCodeAt(++i) & 0x03FF);
				out[p++] = (c >> 18) | 240;
				out[p++] = ((c >> 12) & 63) | 128;
				out[p++] = ((c >> 6) & 63) | 128;
				out[p++] = (c & 63) | 128;
			} else {
				out[p++] = (c >> 12) | 224;
				out[p++] = ((c >> 6) & 63) | 128;
				out[p++] = (c & 63) | 128;
			}
		}
		return out;
	}

	function utf8ByteArrayToString(bytes) { // array of bytes
		var out = [], pos = 0, c = 0;
		while (pos < bytes.length) {
			var c1 = bytes[pos++];
			if (c1 < 128) {
				out[c++] = String.fromCharCode(c1);
			} else if (c1 > 191 && c1 < 224) {
				var c2 = bytes[pos++];
				out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
			} else if (c1 > 239 && c1 < 365) {
				// Surrogate Pair
				var c2 = bytes[pos++];
				var c3 = bytes[pos++];
				var c4 = bytes[pos++];
				var u = ((c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) -
						0x10000;
				out[c++] = String.fromCharCode(0xD800 + (u >> 10));
				out[c++] = String.fromCharCode(0xDC00 + (u & 1023));
			} else {
				var c2 = bytes[pos++];
				var c3 = bytes[pos++];
				out[c++] =
						String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
			}
		}
		return out.join('');
	}

	var b64_table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

	function b64_encode(data) {
		var o1, o2, o3, h1, h2, h3, h4, bits, r, i = 0, enc = "";
		if (!data) { return data; }
		do {
			o1 = data[i++];
			o2 = data[i++];
			o3 = data[i++];
			bits = o1 << 16 | o2 << 8 | o3;
			h1 = bits >> 18 & 0x3f;
			h2 = bits >> 12 & 0x3f;
			h3 = bits >> 6 & 0x3f;
			h4 = bits & 0x3f;
			enc += b64_table.charAt(h1) + b64_table.charAt(h2) + b64_table.charAt(h3) + b64_table.charAt(h4);
		} while (i < data.length);
		r = data.length % 3;
		return (r ? enc.slice(0, r - 3) : enc) + "===".slice(r || 3);
	}

	function b64_decode(data) {
		var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, result = [];
		if (!data) { return data; }
		data += "";
		do {
			h1 = b64_table.indexOf(data.charAt(i++));
			h2 = b64_table.indexOf(data.charAt(i++));
			h3 = b64_table.indexOf(data.charAt(i++));
			h4 = b64_table.indexOf(data.charAt(i++));
			bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;
			o1 = bits >> 16 & 0xff;
			o2 = bits >> 8 & 0xff;
			o3 = bits & 0xff;
			result.push(o1);
			if (h3 !== 64) {
				result.push(o2);
				if (h4 !== 64) {
					result.push(o3);
				}
			}
		} while (i < data.length);
		return result;
	}

	function rand(min, max){
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
	
	function randString(n)	{
		let r = "";
		for(var i = 0; i < n; i++)
			r += String.fromCharCode(rand(1, 65535));

		return r;
	}

	function checksum(s)
	{
		let c = 0
		for (let i = 0; i < s.length; i++)
			c += (s.charCodeAt(i) * (i + 1) - 1);

		return (c).toString(16);
	}

	function xor_encrypt(key, data, seed)
	{
		if (typeof(seed) == "undefined")
			seed = randString(6);

		let c = checksum(key + data),
				d = stringToUtf8ByteArray(seed + String.fromCharCode(0) + c + String.fromCharCode(0) + data),
				k = stringToUtf8ByteArray(key),
				r = [];

		for(var i = 0; i < d.length; i++)
			r[i] = r[i-1] ^ d[i] ^ k[Math.floor(i % k.length)];

		return r;
	}

	function xor_decrypt(key, data)
	{
		let d = data,
				k = stringToUtf8ByteArray(key),
				r = [];

		for(var i = 0; i < d.length; i++)
			r[i] = d[i-1] ^ d[i] ^ k[Math.floor(i % k.length)];

		let s = utf8ByteArrayToString(r.splice(0, r.indexOf(0) + 1).slice(0, -1)),
		c = utf8ByteArrayToString(r.splice(0, r.indexOf(0) + 1).slice(0, -1));
		r = utf8ByteArrayToString(r);
		return c == checksum(key + r) ? r : (console.log("wrong password"), "");
	}

	exports.XORCipher = {
		encode: function(key, data, seed) {
			data = xor_encrypt(key, data, seed);
			return b64_encode(data);
		},
		decode: function(key, data) {
			data = b64_decode(data);
			return xor_decrypt(key, data);
		}
	};

})(this);
