odoo.define('l10n_mn_pos_tax_integration.form_widgets', function (require) {
"use strict";

var core = require('web.core');
var form_widgets = require('web.form_widgets');

var utils = require('web.utils');
var Model = require('web.Model');

var _t = core._t;
var QWeb = core.qweb;

form_widgets.WidgetButton.include({
    on_click: function() {
        var self = this;
        if (this.view.is_disabled) {
            return;
        }

        if (this.$el.hasClass('mn_pos_tax_order_confirm_edit')) {
            var order_data = this.view.datarecord;
            var line_ids = order_data.mn_pos_tax_order_lines;
            var lines;
            lines = _.find(this.view.getChildren(), function(t){
                return t.name === 'mn_pos_tax_order_lines';
            });
            var lines_data = lines.dataset.cache;

            var line_id, line_data;
            var ticket_line_data, ticket_lines = [];
            for (var i = 0; i < line_ids.length; i++) {
                line_id = line_ids[i];
                line_data = lines_data[line_id];
                if (line_data.to_delete || !jQuery.isEmptyObject(line_data.changes)) {
                    alert(_t('Please, save your changes before performing this operation.'));
                    return;
                }

                ticket_line_data = line_data.from_read;
                ticket_lines.push({
                    'code': ticket_line_data.product_code,
                    'name': ticket_line_data.product_name,
                    'measureUnit': ticket_line_data.product_uom,
                    'qty': ticket_line_data.product_qty.toFixed(2),
                    'unitPrice': ticket_line_data.price_unit.toFixed(2),
                    'totalAmount': ticket_line_data.subtotal.toFixed(2),
                    'cityTax': ticket_line_data.subtotal_cct.toFixed(2),
                    'vat': ticket_line_data.subtotal_vat.toFixed(2),
                    'barCode': ticket_line_data.product_barcode
                });
            }

            var ticket = {
                'returnBillId': order_data.mn_pos_tax_billid,

                'amount': order_data.total.toFixed(2),
                'vat': order_data.total_vat.toFixed(2),
                'cashAmount': order_data.total.toFixed(2),
                'nonCashAmount': '0.00',
                'cityTax': order_data.total_cct.toFixed(2),
                'districtCode': order_data.mn_pos_tax_districtcode,
                'posNo': order_data.mn_pos_tax_posno,
                'customerNo': order_data.mn_pos_tax_customerno,
                'billIdSuffix': '{B!D5FX}',
                'billType': order_data.mn_pos_tax_billtype,
                'taxType': order_data.mn_pos_tax_taxtype,
                'branchNo': order_data.mn_pos_tax_branchno,
                'stocks': ticket_lines,
            };

            this.force_disabled = true;
            this.check_disable();
            this.view.disable_button();
            var proxyURL = 'http://' + order_data.mn_pos_tax_return_proxy_ip + ':' + order_data.mn_pos_tax_return_proxy_port;
            $.ajax({
                type: 'POST',
                url: proxyURL + '/posapi/put',
                data: {
                    put9: JSON.stringify(ticket)
                }
            }).always(function(data, status, error) {
                if (status != 'success') {
                    console.log('Sent Data:', ticket);
                    alert(_t('Error') + ' ' + status + ':\n' + _t('Please, check if PosApi Proxy is running!') + '\n' + error);

                    self.view.enable_button();
                    self.force_disabled = false;
                    self.check_disable();
                }
                else {
                    if (!data || !data.length || data.length <= 0) {
                        console.log('Sent Data:', ticket);
                        console.log('Received Data:', data);
                        alert(_t('Error at tax system:') + '\n' + _t('No data received from tax system.'));

                        self.view.enable_button();
                        self.force_disabled = false;
                        self.check_disable();
                        return;
                    }

                    var result = JSON.parse(data);
                    if (!result.success) {
                        console.log('Sent Data:', ticket);
                        console.log('Received Data for Ticket:', result);
                        alert(_t('Error at tax system:') + ' ' + result.errorCode + '\n' + result.message);

                        self.view.enable_button();
                        self.force_disabled = false;
                        self.check_disable();
                        return;
                    }

                    var mn_pos_tax_order = new Model('mn.pos.tax.order');
                    mn_pos_tax_order.call('write', [order_data.id, { 'mn_pos_tax_billid': result.billId }]).then(function (result2) {
                        if (result2) {
                            self.view.reload();
                        } else {
                            alert(_t('New \'PUID: ' + result.billId + '\' could not be saved.\nPlease update it manually.'));
                        }

                        self.view.enable_button();
                        self.force_disabled = false;
                        self.check_disable();
                    });

                    $.get(proxyURL + '/posapi/send', function(data) {
                        var result3 = JSON.parse(data);
                        if (!result3.success) {
                            console.log(result3);
                            alert(_t('Error at tax system:') + ' ' + result3.errorCode + '\n' + result3.message);
                        }
                    });
                }
            });
        }
        else if (this.$el.hasClass('mn_pos_tax_order_cancel')) {
            var order_data = this.view.datarecord,
                line_ids = order_data.mn_pos_tax_order_lines,
                lines;
            lines = _.find(this.view.getChildren(), function(t){
                return t.name === 'mn_pos_tax_order_lines';
            });
            var lines_data = lines.dataset.cache;

            var line_id, line_data;
            for (var i = 0; i < line_ids.length; i++) {
                line_id = line_ids[i];
                line_data = lines_data[line_id];
                if (line_data.to_delete || !jQuery.isEmptyObject(line_data.changes)) {
                    alert(_t('Please, discard your changes before performing this operation.'));
                    return;
                }
            }

            var ticket = {
                'returnBillId': order_data.mn_pos_tax_billid,
                'date': order_data.mn_pos_tax_billdate
            };

            this.force_disabled = true;
            this.check_disable();
            this.view.disable_button();
            var proxyURL = 'http://' + order_data.mn_pos_tax_return_proxy_ip + ':' + order_data.mn_pos_tax_return_proxy_port;
            $.ajax({
                type: 'POST',
                url: proxyURL + '/posapi/return',
                data: {
                    rd: JSON.stringify(ticket)
                }
            }).always(function(data, status, error) {
                if (status != 'success') {
                    console.log('Sent Data:', ticket);
                    alert(_t('Error') + ' ' + status + ':\n' + _t('Please, check if PosApi Proxy is running!') + '\n' + error);

                    self.view.enable_button();
                    self.force_disabled = false;
                    self.check_disable();
                }
                else {
                    if (!data || !data.length || data.length <= 0) {
                        console.log('Sent Data:', ticket);
                        console.log('Received Data:', data);
                        alert(_t('Error at tax system:') + '\n' + _t('No data received from tax system.'));

                        self.view.enable_button();
                        self.force_disabled = false;
                        self.check_disable();
                        return;
                    }

                    var result = JSON.parse(data);
                    if (!result.success) {
                        console.log('Sent Data:', ticket);
                        console.log('Received Data for Ticket:', result);
                        alert(_t('Error at tax system:') + ' ' + result.errorCode + '\n' + result.message);

                        self.view.enable_button();
                        self.force_disabled = false;
                        self.check_disable();
                        return;
                    }

                    var mn_pos_tax_order = new Model('mn.pos.tax.order');
                    mn_pos_tax_order.call('write', [order_data.id, { 'state': 'cancel' }]).then(function (result2) {
                        self.view.reload();

                        self.view.enable_button();
                        self.force_disabled = false;
                        self.check_disable();
                    });

                    $.get(proxyURL + '/posapi/send', function(data) {
                        var result3 = JSON.parse(data);
                        if (!result3.success) {
                            console.log(result3);
                            alert(_t('Error at tax system:') + ' ' + result3.errorCode + '\n' + result3.message);
                        }
                    });
                }
            });
        }
        /*
        else if (this.$el.hasClass('mn_pos_tax_send_data')) {
            var session_data = this.view.datarecord;
            var is_success = false;
            var proxyURL = 'http://' + session_data.mn_pos_tax_proxy_ip + ':' + session_data.mn_pos_tax_proxy_port;
            $.ajax({
                type: 'GET',
                async: false,
                url: proxyURL + '/posapi/send'
            }).always(function(data, status, error) {
                if (status != 'success') {
                    alert(_t('Error:') + '\n' + _t('Please, check if PosApi Proxy is running!') + '\n' + error);
                    return;
                }

                var result = JSON.parse(data);
                if (!result || !result.success) {
                    alert(_t('Tax Data Not Sent:') + ' ' + result.errorCode + '\n' + result.message);
                    return;
                }

                is_success = true;
            });

            if (is_success) {
                this._super();
            }
        }
        */
        else {
            this._super();
        }
    }
});

});