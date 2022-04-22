odoo.define('l10n_mn_pos_tax_integration.db', function (require) {
"use strict";

var PosDB = require('point_of_sale.DB');

PosDB.include({
    init: function(options) {
        var self = this;
        this._super(options);

        this.universal_category_code_by_id = {};
        this.vatx_product_code_by_id = {};
        this.vatz_product_code_by_id = {};
    },
    add_universal_category_codes: function(codes){
        var self = this;

        for(var i=0, len = codes.length; i < len; i++){
            this.universal_category_code_by_id[codes[i].id] = codes[i];
        }
    },
    add_vatx_product_codes: function(codes){
        var self = this;

        for(var i=0, len = codes.length; i < len; i++){
            this.vatx_product_code_by_id[codes[i].id] = codes[i];
        }
    },
    add_vatz_product_codes: function(codes){
        var self = this;

        for(var i=0, len = codes.length; i < len; i++){
            this.vatz_product_code_by_id[codes[i].id] = codes[i];
        }
    },
    get_universal_category_code_by_id: function(code_id){
        if(code_id instanceof Array){
            var list = [];
            for(var i = 0, len = code_id.length; i < len; i++){
                var code = this.universal_category_code_by_id[code_id[i]];
                if(code){
                    list.push(code);
                }else{
                    console.error("get_universal_category_code_by_id: no code has id:", code_id[i]);
                }
            }
            return list;
        }else{
            return this.universal_category_code_by_id[code_id];
        }
    },
    get_vatx_product_code_by_id: function(code_id){
        if(code_id instanceof Array){
            var list = [];
            for(var i = 0, len = code_id.length; i < len; i++){
                var code = this.vatx_product_code_by_id[code_id[i]];
                if(code){
                    list.push(code);
                }else{
                    console.error("get_vatx_product_code_by_id: no code has id:", code_id[i]);
                }
            }
            return list;
        }else{
            return this.vatx_product_code_by_id[code_id];
        }
    },
    get_vatz_product_code_by_id: function(code_id){
        if(code_id instanceof Array){
            var list = [];
            for(var i = 0, len = code_id.length; i < len; i++){
                var code = this.vatz_product_code_by_id[code_id[i]];
                if(code){
                    list.push(code);
                }else{
                    console.error("get_vatz_product_code_by_id: no code has id:", code_id[i]);
                }
            }
            return list;
        }else{
            return this.vatz_product_code_by_id[code_id];
        }
    },
});

});

function safeJSON(str) {
    var json = null;
    try {
        json = JSON.parse(str);
    } catch (e) {
        return null;
    }
    return json;
}
function getTwoDigitString(pNumber) {
    return (pNumber < 10 ? "0" + pNumber : pNumber.toString());
}

Date.prototype.toMNString = function(pDateSep) {
    var year = this.getFullYear(),
        month = this.getMonth() + 1,
        day = this.getDate(),
        hour = this.getHours(),
        minute = this.getMinutes(),
        second = this.getSeconds(),
        mnDate = year + pDateSep + getTwoDigitString(month) + pDateSep + getTwoDigitString(day) + " " +
            getTwoDigitString(hour) + ":" + getTwoDigitString(minute) + ":" + getTwoDigitString(second);

    return mnDate;
}