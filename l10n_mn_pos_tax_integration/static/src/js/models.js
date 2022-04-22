odoo.define('l10n_mn_pos_tax_integration.models', function (require) {
"use strict";

var core = require('web.core');
var models = require('point_of_sale.models');
var utils = require('web.utils');

var _t = core._t;
var round_pr = utils.round_precision;

models.load_fields('res.company', ['mn_pos_tax_multi_sellers']);
models.load_fields('res.partner', ['mn_taxpayer_name']);
models.load_fields('account.tax', ['mn_pos_tax_type']);
models.load_fields('pos.category', ['mn_pos_tax_seller_id']);
models.load_fields('pos.session', ['mn_pos_tax_register_missed_orders']);
models.load_fields('pos.session', ['mn_pos_tax_date_missed_orders']);
models.load_fields('product.product', ['mn_pos_tax_universal_category_code_id']);
models.load_fields('product.product', ['mn_pos_tax_vatx_product_code_id']);
models.load_fields('product.product', ['mn_pos_tax_vatz_product_code_id']);

models.load_models([
    {
        model: 'mn.pos.tax.universal.category.code',
        fields: ['code'],
        domain: null,
        loaded: function(self, codes){
            self.db.add_universal_category_codes(codes);
        },
    },
    {
        model: 'mn.pos.tax.vatx.product.code',
        fields: ['code'],
        domain: null,
        loaded: function(self, codes){
            self.db.add_vatx_product_codes(codes);
        },
    },
    {
        model: 'mn.pos.tax.vatz.product.code',
        fields: ['code'],
        domain: null,
        loaded: function(self, codes){
            self.db.add_vatz_product_codes(codes);
        },
    },
],{'after': 'product.product'});

var _super_posmodel = models.PosModel.prototype;
models.PosModel = models.PosModel.extend({
    after_load_server_data: function(){
        _super_posmodel.after_load_server_data.apply(this,arguments);

        var taxes = this.taxes;
        var cct, vat, vatx, vatz;

        vat = _.find(taxes, function(t){
            return t.mn_pos_tax_type === "vat";
        });
        if (!vat) {
            throw new Error(_t("VAT is not defined. Please set it in Configuration > Settings"));
        }

        vatx = _.find(taxes, function(t){
            return t.mn_pos_tax_type === "vatx";
        });
        if (!vatx) {
            throw new Error(_t("VAT Exempt is not defined. Please set it in Configuration > Settings"));
        }

        vatz = _.find(taxes, function(t){
            return t.mn_pos_tax_type === "vatz";
        });
        if (!vatz) {
            throw new Error(_t("VAT 0% is not defined. Please set it in Configuration > Settings"));
        }

        cct = _.find(taxes, function(t){
            return t.mn_pos_tax_type === "cct";
        });
        if (!cct) {
            throw new Error(_t("CCT is not defined. Please set it in Configuration > Settings"));
        }
    },
});

var _super_order = models.Order.prototype;
models.Order = models.Order.extend({
    initialize: function(attributes, options){
        this.mn_pos_tax_orders = [];
        this.mn_pos_tax_errors = [];
        this.set({ mn_pos_tax_vatpayer: null });

        this.mn_pos_order = false;

        _super_order.initialize.apply(this,arguments);

        return this;
    },
    init_from_JSON: function(json) {
        var mn_pos_tax_vatpayer = json.mn_pos_tax_vatpayer;

        _super_order.init_from_JSON.apply(this,arguments);

        this.set_mn_pos_tax_vatpayer(mn_pos_tax_vatpayer);
    },
    set_client: function(client) {
        _super_order.set_client.apply(this,arguments);

        var customer = this.get_client();
        var value = null;
        if (customer && customer.vat) {
            var customer_name = customer.mn_taxpayer_name ? customer.mn_taxpayer_name : customer.name;
            value = {
                'tin': customer.vat,
                'ebarimt_id': null,
                'name': customer_name,
            }
        }
        this.set_mn_pos_tax_vatpayer(value);
        $('.js_mn_pos_tax_vatpayer').text(this.get_mn_pos_tax_vatpayer_string());
    },
    export_as_JSON: function() {
        var json = _super_order.export_as_JSON.apply(this,arguments);

        json.mn_pos_tax_orders = this.mn_pos_tax_orders;
        json.mn_pos_tax_errors = this.mn_pos_tax_errors;
        json.mn_pos_tax_vatpayer = this.get_mn_pos_tax_vatpayer();

        // Register missed orders for the previous month
        if (this.pos.pos_session.mn_pos_tax_register_missed_orders) {
            var order_date = new Date(),
                date_missed_orders = new Date(this.pos.pos_session.mn_pos_tax_date_missed_orders);
            order_date.setFullYear(date_missed_orders.getFullYear());
            order_date.setMonth(date_missed_orders.getMonth());
            order_date.setDate(date_missed_orders.getDate());
            json.creation_date = order_date;
        }

        return json;
    },
    is_mn_pos_order: function() {
        return this.mn_pos_order;
    },
    export_for_printing: function(){
        var receipt = _super_order.export_for_printing.apply(this,arguments);
        receipt.mn_pos_tax_posno = this.pos.config.mn_pos_tax_posno;
        receipt.mn_pos_tax_vatpayer = this.get_mn_pos_tax_vatpayer();

        var print_date = new Date(receipt.date.isostring);
        if (this.pos.pos_session.mn_pos_tax_register_missed_orders) {
            var date_missed_orders = new Date(this.pos.pos_session.mn_pos_tax_date_missed_orders);
            print_date.setFullYear(date_missed_orders.getFullYear());
            print_date.setMonth(date_missed_orders.getMonth());
            print_date.setDate(date_missed_orders.getDate());
        }
        receipt.print_date = print_date.toMNString('-');

        if (this.mn_pos_tax_orders.length > 0) {
            var mn_pos_tax_order, mn_pos_tax_orders = [],
                taxes = this.pos.taxes;
            for (var i = 0; i < this.mn_pos_tax_orders.length; i++) {
                mn_pos_tax_order = this.mn_pos_tax_orders[i];
                if (mn_pos_tax_order.dependency === 'sub_bill')
                    continue;

                mn_pos_tax_orders.push({
                    'billid': mn_pos_tax_order.mn_pos_tax_billid,
                    'lottery': mn_pos_tax_order.mn_pos_tax_lottery,
                    'qrdata': mn_pos_tax_order.mn_pos_tax_qrdata,
                    'amount': mn_pos_tax_order.mn_pos_tax_amount
                });

                if (mn_pos_tax_order.mn_pos_tax_type === '2') {
                    var vatx;
                    vatx = _.find(taxes, function(t) {
                        return t.mn_pos_tax_type === "vatx";
                    });
                    receipt.mn_pos_tax_vatx_name = vatx.name;
                }
                else if (mn_pos_tax_order.mn_pos_tax_type === '3') {
                    var vatz;
                    vatz = _.find(taxes, function(t) {
                        return t.mn_pos_tax_type === "vatz";
                    });
                    receipt.mn_pos_tax_vatz_name = vatz.name;
                }
            }

            receipt.mn_pos_tax_orders = mn_pos_tax_orders;
        }

        return receipt;
    },
    set_mn_pos_tax_vatpayer: function(mn_pos_tax_vatpayer) {
        this.set('mn_pos_tax_vatpayer', mn_pos_tax_vatpayer);
    },
    get_mn_pos_tax_vatpayer: function() {
        return this.get('mn_pos_tax_vatpayer');
    },
    get_mn_pos_tax_vatpayer_string: function() {
        var mn_pos_tax_vatpayer = this.get_mn_pos_tax_vatpayer();

        if (mn_pos_tax_vatpayer) {
            if (mn_pos_tax_vatpayer.tin) {
                var name = (mn_pos_tax_vatpayer.name.length > 10 ? mn_pos_tax_vatpayer.name.substr(0, 10) + '...' : mn_pos_tax_vatpayer.name);
                return mn_pos_tax_vatpayer.tin + '-' + name;
            }
            else if (mn_pos_tax_vatpayer.ebarimt_id) {
                return mn_pos_tax_vatpayer.ebarimt_id;
            }
        }

        return _t('Tax Payer');
    },
    get_orderlines_by_taxes: function() {
        var self = this;

        var orderlines = this.get_orderlines();
        var orderlines_vat = [], orderlines_vatx = [], orderlines_vatz = [];
        var taxes = this.pos.taxes;
        var line, product, product_taxes_ids, product_taxes;
        for (var i = 0; i < orderlines.length; i++) {
            line = orderlines[i];
            if (line.is_reward())  // Reward products are ignored
                continue;

            product = line.get_product();
            product_taxes_ids = product.taxes_id;
            product_taxes = [];

            _(product_taxes_ids).each(function(el){
                product_taxes.push(self.pos.taxes_by_id[el]);
            });

            if (product_taxes.length > 0) {
                for (var j = 0; j < product_taxes.length; j++) {
                    var tax = line._map_tax_fiscal_position(product_taxes[j]);
                    var mn_pos_tax_type = tax.mn_pos_tax_type;

                    if (mn_pos_tax_type === 'vat') {            // VAT
                        orderlines_vat.push(line);
                        break;
                    }
                    else if (mn_pos_tax_type === 'vatx') {      // VAT Exempt
                        orderlines_vatx.push(line);
                        break;
                    }
                    else if (mn_pos_tax_type === 'vatz') {      // VAT 0%
                        orderlines_vatz.push(line);
                        break;
                    }
                    else {
                        orderlines_vat.push(line);
                        break;
                    }
                }
            }
            else {
                orderlines_vat.push(line);
            }
        }

        var orderlines_by_taxes = [];

        if (orderlines_vat.length) {
            orderlines_by_taxes.push({
                'taxtype': 1,
                'orderlines': orderlines_vat
            });
        }
        if (orderlines_vatx.length) {
            orderlines_by_taxes.push({
                'taxtype': 2,
                'orderlines': orderlines_vatx
            });
        }
        if (orderlines_vatz.length) {
            orderlines_by_taxes.push({
                'taxtype': 3,
                'orderlines': orderlines_vatz
            });
        }

        return orderlines_by_taxes;
    }
});

var _super_orderline = models.Orderline.prototype;
models.Orderline = models.Orderline.extend({
    get_unit_bonus: function() {
        if (!this.pos.bonus_program || !this.order.get_client()) {
            return 0;
        }

        if (this.get_reward()) {
            return 0;
        }

        var quantity = this.get_quantity();
        var unit_bonus = round_pr(this.get_won_points() / (quantity === 0 ? 1 : quantity), this.pos.bonus_program.rounding);

        return unit_bonus;
    },
    get_mn_pos_tax_details: function(mn_pos_tax_type) {
        var self = this;

        var quantity = this.get_quantity();
        if (this.get_discount_type() === 'percent') {
            var price_unit = this.get_unit_price() * (1.0 - (this.get_discount() / 100.0));
        }
        else {
            var price_unit = this.get_unit_price() - this.get_discount();
        }
        price_unit -= this.get_unit_bonus();

        var product = this.get_product(),
            taxes_ids = product.taxes_id,
            taxes = this.pos.taxes,
            taxtype_detail = {},
            taxtype_detail_raw = {},
            product_taxes = [];

        _(taxes_ids).each(function(el){
            product_taxes.push(_.detect(taxes, function(t){
                return t.id === el;
            }));
        });

        var all_taxes = this.compute_all(product_taxes, price_unit, quantity, this.pos.currency.rounding);
        _(all_taxes.taxes).each(function(tax) {
            var mn_pos_tax_type = self.pos.taxes_by_id[tax.id].mn_pos_tax_type;
            if (mn_pos_tax_type) {
                taxtype_detail[mn_pos_tax_type] = tax.amount;
                taxtype_detail_raw[mn_pos_tax_type] = tax.amount_raw;
            }
        });

        var code = '';
        if (mn_pos_tax_type === 1) {
            var universal_category_code = this.pos.db.get_universal_category_code_by_id(product.mn_pos_tax_universal_category_code_id[0]);
            if (universal_category_code)
                code = universal_category_code.code;
        }
        else if (mn_pos_tax_type === 2) {
            var vatx_product_code = this.pos.db.get_vatx_product_code_by_id(product.mn_pos_tax_vatx_product_code_id[0]);
            if (vatx_product_code)
                code = vatx_product_code.code;
        }
        else if (mn_pos_tax_type === 3) {
            var vatz_product_code = this.pos.db.get_vatz_product_code_by_id(product.mn_pos_tax_vatz_product_code_id[0]);
            if (vatz_product_code)
                code = vatz_product_code.code;
        }

        if (!code) {
            if (product.barcode)
                code = product.barcode;
            else
                code = '6225900';
        }

        return {
            'productId': product.id,
            'productName': product.display_name,
            'productCode': product.default_code || product.display_name.substr(0, 10),
            'barcode': code,
            'uom': this.get_unit().display_name,
            'uom_id': this.get_unit().id,
            'quantity': quantity,
            'unitPrice': price_unit,
            'taxIds': [[6, false, _.map(this.get_applicable_taxes(), function(tax){ return self._map_tax_fiscal_position(tax).id; })]],
            'priceWithTax': all_taxes.total_included,
            'priceWithoutTax': all_taxes.total_excluded,
            'taxTypeDetails': taxtype_detail,
            'taxTypeDetailsRaw': taxtype_detail_raw,
        };
    },
    is_reward: function() {
        if (!this.pos.bonus_program || !this.order.get_client()) {
            return false;
        }

        if (this.get_reward()) {  // Reward products are ignored
            return true;
        }

        return false;
    },
});

});
