odoo.define('l10n_mn_pos_tax_integration.screens', function (require) {
"use strict";

var core = require('web.core');
var screens = require('point_of_sale.screens');
var gui = require('point_of_sale.gui');
var PopupWidget = require('point_of_sale.popups');

var _t = core._t;

var payment_screen_keypress_handler;
var payment_screen_keydown_handler;

var MnPosTaxTINPopupWidget = PopupWidget.extend({
    template: 'MnPosTaxTINPopupWidget',
    init: function(parent, args) {
        var self = this;
        this._super(parent, args);

        this.tin_pattern = /(^[А-ЯЁӨҮ]{2}[0-9]{8}$)|(^\d{7}$)/;
        this.taxpayer_notfound = _t('A Tax Payer with this registry number is not found.') + '\n' +
                                 _t('You might have mistyped it. ') + '\n' +
                                 _t('Or your internet connection is lost.' + '\n' +
                                 _t('In case your internet connection is down, please type Tax Payer Name manually'));

        this.mn_pos_tax_tin_popup_keydown_handler = function(e) {
            if (e.keyCode === 13) { // Enter - Confirm Popup
                e.preventDefault();
                var taxpayer_tin = self.$('#mn_pos_tax_vatpayer_tin');
                if (taxpayer_tin.is(':focus')) {
                    var tin = taxpayer_tin.val();

                    if (self.is_tin_empty(taxpayer_tin, tin)) {
                        return;
                    }

                    if (self.is_tin_invalid(taxpayer_tin, tin)) {
                        return;
                    }

                    var proxyURL = 'http://' + self.pos.config.mn_pos_tax_proxy_ip + ':' + self.pos.config.mn_pos_tax_proxy_port;
                    $.ajax({
                        type: 'GET',
                        url: proxyURL + '/posapi/taxpayer',
                        data: { regno: tin }
                    }).always(function(data, status, error) {
                        if (status != 'success') {
                            self.gui.show_popup('error',{
                                'title': _t('Error') + ' ' + status,
                                'body': _t('Please, check if PosApi Proxy is running!') + '\n' + error
                            });
                            return;
                        }

                        var result = safeJSON(data);

                        if (!result || !result.found) {
                            self.gui.show_popup('error',{
                                'title': _t('Not Found'),
                                'body': self.taxpayer_notfound
                            });
                            taxpayer_tin.focus();
                            taxpayer_tin.select();
                            return;
                        }

                        /*
                        if (!result.vatpayer) {
                            self.gui.show_popup('error',{
                                'title': _t('Not VAT Payer'),
                                'body': _t('The entity with this registry number is not a VAT Payer.') + '\n' +
                                        _t('Please enter a registry number of valid VAT Payer.')
                            });
                            taxpayer_tin.focus();
                            taxpayer_tin.select();
                            return;
                        }
                        */

                        var taxpayer_name = self.$('#mn_pos_tax_vatpayer_name');
                        taxpayer_name.val(result.name);
                        taxpayer_name.focus();
                        taxpayer_name.select();
                    });
                }
                else {
                    self.click_confirm();
                }
            }
            else if (e.keyCode === 27) { // Esc - Cancel Popup
                e.preventDefault();
                self.click_cancel();
            }
            else if ((e.keyCode >= 112 && e.keyCode <= 115) || (e.keyCode >= 117 && e.keyCode <= 121)) { /* F1~F4, F6~F10 */
                e.preventDefault();
            }
        };
    },
    show: function(options) {
        options = options || {};
        this._super(options);

        window.document.body.removeEventListener('keypress', payment_screen_keypress_handler);
        window.document.body.removeEventListener('keydown', payment_screen_keydown_handler);
        if (this.popup_keydown_handler) {
            window.document.body.removeEventListener('keydown', this.popup_keydown_handler);
        }
        if (this.mn_pos_tax_tin_popup_keydown_handler) {
            window.document.body.addEventListener('keydown', this.mn_pos_tax_tin_popup_keydown_handler);
        }

        this.renderElement();
        var taxpayer_tin = this.$('#mn_pos_tax_vatpayer_tin');
        var taxpayer_name = this.$('#mn_pos_tax_vatpayer_name');
        if (options.value) {
            var value = options.value;
            taxpayer_tin.val(value.tin);
            taxpayer_name.val(value.name);
        }
        taxpayer_tin.focus();
        taxpayer_tin.select();
    },
    hide: function() {
        var self = this;
        this._super();

        if (this.mn_pos_tax_tin_popup_keydown_handler) {
            window.document.body.removeEventListener('keydown', this.mn_pos_tax_tin_popup_keydown_handler);
        }
        window.document.body.addEventListener('keypress', payment_screen_keypress_handler);
        window.document.body.addEventListener('keydown', payment_screen_keydown_handler);
    },
    click_confirm: function() {
        if(this.options.confirm){
            var taxpayer_tin = this.$('#mn_pos_tax_vatpayer_tin');
            var tin = taxpayer_tin.val();
            var taxpayer_name = this.$('#mn_pos_tax_vatpayer_name');
            var name = taxpayer_name.val();
            var value;

            if (tin === '' && name === '') {
                value = null;
            }
            else if (tin !== '' && name !== '') {
                if (this.is_tin_invalid(taxpayer_tin, tin)) {
                    return;
                }

                value = {
                    'tin': tin,
                    'ebarimt_id': null,
                    'name': name
                };
            }
            else {
                if (!this.is_tin_empty(taxpayer_tin, tin)) {
                    this.gui.show_popup('error',{
                        'title': _t('Empty'),
                        'body': _t('Name is empty! Please enter the Tax Payer Name!')
                    });

                    this.$('#mn_pos_tax_vatpayer_name').focus();
                }
                return;
            }

            this.options.confirm.call(this, value);
        }

        this.gui.close_popup();
    },
    is_tin_empty: function(taxpayer_tin, tin) {
        if (tin === '') {
            this.gui.show_popup('error',{
                'title': _t('Empty'),
                'body': _t('TIN is empty! You must enter a valid TIN!')
            });

            taxpayer_tin.focus();
            return true;
        } else {
            return false;
        }
    },
    is_tin_invalid: function(taxpayer_tin, tin) {
        if (!this.tin_pattern.test(tin)) {
            this.gui.show_popup('error',{
                'title': _t('Not Valid TIN'),
                'body': _t('This is not a valid TIN. It should be \n a company registry number (e.g. 1234567) or \n an individual\'s registry number (e.g. AA88112233)!')
            });
            taxpayer_tin.focus();
            taxpayer_tin.select();
            return true;
        }
        else {
            return false;
        }
    }
});
gui.define_popup({name:'mn_pos_tax_tin_popup_widget', widget: MnPosTaxTINPopupWidget});

var MnPosTaxEbarimtIDPopupWidget = PopupWidget.extend({
    template: 'MnPosTaxEbarimtIDPopupWidget',
    init: function(parent, args) {
        var self = this;
        this._super(parent, args);

        this.ebarimt_id_pattern = /(^\d{8}$)/;
        this.mn_pos_tax_ebarimt_id_popup_keydown_handler = function(e) {
            if (e.keyCode === 13) { // Enter - Confirm Popup
                e.preventDefault();
                self.click_confirm();
            }
            else if (e.keyCode === 27) { // Esc - Cancel Popup
                e.preventDefault();
                self.click_cancel();
            }
            else if ((e.keyCode >= 112 && e.keyCode <= 115) || (e.keyCode >= 117 && e.keyCode <= 121)) { /* F1~F4, F6~F10 */
                e.preventDefault();
            }
        };
    },
    show: function(options) {
        options = options || {};
        this._super(options);

        window.document.body.removeEventListener('keypress', payment_screen_keypress_handler);
        window.document.body.removeEventListener('keydown', payment_screen_keydown_handler);
        if (this.popup_keydown_handler) {
            window.document.body.removeEventListener('keydown', this.popup_keydown_handler);
        }
        if (this.mn_pos_tax_ebarimt_id_popup_keydown_handler) {
            window.document.body.addEventListener('keydown', this.mn_pos_tax_ebarimt_id_popup_keydown_handler);
        }

        this.renderElement();
        var mn_pos_tax_ebarimt_id = this.$('#mn_pos_tax_ebarimt_id');
        if (options.value) {
            var value = options.value;
            mn_pos_tax_ebarimt_id.val(value.ebarimt_id);
        }
        mn_pos_tax_ebarimt_id.focus();
        mn_pos_tax_ebarimt_id.select();
    },
    hide: function() {
        var self = this;
        this._super();

        if (this.mn_pos_tax_ebarimt_id_popup_keydown_handler) {
            window.document.body.removeEventListener('keydown', this.mn_pos_tax_ebarimt_id_popup_keydown_handler);
        }
        window.document.body.addEventListener('keypress', payment_screen_keypress_handler);
        window.document.body.addEventListener('keydown', payment_screen_keydown_handler);
    },
    click_confirm: function() {
        if(this.options.confirm){
            var mn_pos_tax_ebarimt_id = this.$('#mn_pos_tax_ebarimt_id');
            var ebarimt_id = mn_pos_tax_ebarimt_id.val();
            var value;

            if (ebarimt_id === '') {
                value = null;
            }
            else {
                if (this.is_ebarimt_id_invalid(mn_pos_tax_ebarimt_id, ebarimt_id)) {
                    return;
                }

                value = {
                    'tin': null,
                    'ebarimt_id': ebarimt_id,
                    'name': null
                };
            }

            this.options.confirm.call(this, value);
        }

        this.gui.close_popup();
    },
    is_ebarimt_id_invalid: function(mn_pos_tax_ebarimt_id, ebarimt_id) {
        if (!this.ebarimt_id_pattern.test(ebarimt_id)) {
            this.gui.show_popup('error',{
                'title': _t('Not Valid ID'),
                'body': _t('This is not a valid EBARIMT.MN ID. It should be an 8 digit number (e.g. 12345678)!')
            });
            mn_pos_tax_ebarimt_id.focus();
            mn_pos_tax_ebarimt_id.select();
            return true;
        }
        else {
            return false;
        }
    }
});
gui.define_popup({name:'mn_pos_tax_ebarimt_id_popup_widget', widget: MnPosTaxEbarimtIDPopupWidget});

var MnPosTaxPayerPopupWidget = PopupWidget.extend({
    template: 'MnPosTaxPayerPopupWidget',
    init: function(parent, args) {
        var self = this;
        this._super(parent, args);

        this.mn_pos_tax_vatpayer_popup_keydown_handler = function(e) {
            if (e.keyCode === 27) { // Esc - Cancel Popup
                e.preventDefault();
                self.click_cancel();
            }
            else if ((e.keyCode >= 112 && e.keyCode <= 115) || (e.keyCode >= 117 && e.keyCode <= 121)) { /* F1~F4, F6~F10 */
                e.preventDefault();
            }
        };
    },
    renderElement: function() {
        var self = this;
        this._super();

        this.$('#mn_pos_tax_register_tin').click(function() {
            var order = self.pos.get_order();
            var taxpayer = order.get_mn_pos_tax_vatpayer();

            self.gui.show_popup('mn_pos_tax_tin_popup_widget', {
                'title': _t('TIN'),
                'value': taxpayer,
                'confirm': function(value) {
                    order.set_mn_pos_tax_vatpayer(value);
                    $('.js_mn_pos_tax_vatpayer').text(order.get_mn_pos_tax_vatpayer_string());
                }
            });
        });

        this.$('#mn_pos_tax_register_ebarimt_id').click(function() {
            var order = self.pos.get_order();
            var taxpayer = order.get_mn_pos_tax_vatpayer();

            self.gui.show_popup('mn_pos_tax_ebarimt_id_popup_widget', {
                'title': _t('EBARIMT.MN ID'),
                'value': taxpayer,
                'confirm': function(value) {
                    order.set_mn_pos_tax_vatpayer(value);
                    $('.js_mn_pos_tax_vatpayer').text(order.get_mn_pos_tax_vatpayer_string());
                }
            });
        });
    },
    show: function(options){
        options = options || {};
        this._super(options);

        window.document.body.removeEventListener('keypress', payment_screen_keypress_handler);
        window.document.body.removeEventListener('keydown', payment_screen_keydown_handler);
        if (this.popup_keydown_handler) {
            window.document.body.removeEventListener('keydown', this.popup_keydown_handler);
        }
        if (this.mn_pos_tax_vatpayer_popup_keydown_handler) {
            window.document.body.addEventListener('keydown', this.mn_pos_tax_vatpayer_popup_keydown_handler);
        }
    },
    hide: function() {
        var self = this;
        this._super();

        if (this.mn_pos_tax_vatpayer_popup_keydown_handler) {
            window.document.body.removeEventListener('keydown', this.mn_pos_tax_vatpayer_popup_keydown_handler);
        }
        window.document.body.addEventListener('keypress', payment_screen_keypress_handler);
        window.document.body.addEventListener('keydown', payment_screen_keydown_handler);
    },
});
gui.define_popup({name:'mn_pos_tax_vatpayer_popup_widget', widget: MnPosTaxPayerPopupWidget});

screens.PaymentScreenWidget.include({
    init: function(parent, options) {
        var self = this;
        this._super(parent, options);

        this.mn_pos_tax_keydown_handler = function(e){
            if (!self.gui.has_popup()) {
                if (!e.ctrlKey) {
                    if (e.keyCode === 45) { // Insert - Show Tax Payer Popup
                        self.click_set_mn_pos_tax_vatpayer();
                    } else if ((e.keyCode >= 112 && e.keyCode <= 115) || (e.keyCode >= 117 && e.keyCode <= 121)) { // F1~F4, F6~F10
                        e.preventDefault();
                    }
                }
            }
        };
    },
    renderElement: function() {
        var self = this;
        this._super();

        this.$('.js_set_mn_pos_tax_vatpayer').click(function() {
            self.click_set_mn_pos_tax_vatpayer();
        });
    },
    show: function() {
        payment_screen_keypress_handler = this.keyboard_handler;
        payment_screen_keydown_handler = this.keyboard_keydown_handler;

        if (this.mn_pos_tax_keydown_handler) {
            window.document.body.addEventListener('keydown', this.mn_pos_tax_keydown_handler);
        }

        this._super();
    },
    hide: function() {
        if (this.mn_pos_tax_keydown_handler) {
            window.document.body.removeEventListener('keydown', this.mn_pos_tax_keydown_handler);
        }

        this._super();
    },
    order_is_valid: function(force_validation) {
        if (!this._super(force_validation))
            return false;

        var self = this;
        var order = this.pos.get_order();

        if (order.is_mn_pos_order())
            return true;

        // Fiscal position
        var mn_pos_tax_vatpayer = order.get_mn_pos_tax_vatpayer();
        if (order.fiscal_position && !mn_pos_tax_vatpayer) {
            this.gui.show_popup('error',{
                'title': _t('Tax Payer Required'),
                'body':  _t('Please provide Tax Payer.'),
            });
            return false;
        }

        // Previous month order
        if (this.pos.pos_session.mn_pos_tax_register_missed_orders && (!mn_pos_tax_vatpayer || !mn_pos_tax_vatpayer.tin)) {
            this.gui.show_popup('error',{
                'title': _t('Tax Payer Required'),
                'body':  _t('Please provide Tax Payer to register an order for the previous month!'),
            });
            return false;
        }

        // Card amount
        var plines = order.get_paymentlines(),
            amount_card_total = 0;
        _(plines).each(function(pline) {
            if (pline.get_type() === 'bank') {
                amount_card_total += pline.get_amount();
                if (order.get_change(pline) > 0) {
                    self.gui.show_popup('error',{
                        'title': _t('Change for Card Payment'),
                        'body':  _t('Card payment can not have a change.'),
                    });

                    return false;
                }
            }
        });

        order.mn_pos_tax_orders = [];
        order.mn_pos_tax_errors = [];
        if (this.pos.company.mn_pos_tax_multi_sellers && order.is_credit_sales()) {
            return true;
        }

        var tickets = this.process_mn_pos_tax_tickets(amount_card_total, mn_pos_tax_vatpayer);
        if (!tickets)
            return false;

        var proxyURL = 'http://' + this.pos.config.mn_pos_tax_proxy_ip + ':' + this.pos.config.mn_pos_tax_proxy_port;
        $.ajax({
            type: 'POST',
            async: false,
            url: proxyURL + '/posapi/put',
            // timeout: 500, // Implement it later & refer to pos_lock_screen module. var msgProcessing = _t('Processing your request...');
            data: {
                put1: tickets.ticket_vat === '' ? '' : JSON.stringify(tickets.ticket_vat),
                put2: tickets.ticket_vatX === '' ? '' : JSON.stringify(tickets.ticket_vatX),
                put3: tickets.ticket_vatZ === '' ? '' : JSON.stringify(tickets.ticket_vatZ),
            }
        }).always(function(data, status, error) {
            if (status != 'success') {
                console.log('Sent Data:', tickets);
                self.gui.show_popup('error',{
                    'title': _t('Error') + ' ' + status,
                    'body': _t('Please, check if PosApi Proxy is running!') + '\n' + error
                });
                return false;
            }
            else {
                console.log('Sent Data:', tickets);     // TEMP

                var result = safeJSON(data);

                console.log('Returned Data:', result);  // TEMP

                if (!result || !result.length || result.length <= 0) {
                    console.log('Sent Data:', tickets);
                    console.log('Received Data:', result);
                    self.gui.show_popup('error',{
                        'title': _t('Error at tax system:'),
                        'body': _t('No data received from tax system.')
                    });
                    return false;
                }

                var errorCount = 0,
                    mn_pos_tax_order_lines;
                for (var i = 0; i < result.length; i++) {
                    if (!result[i].success) {
                        errorCount++;
                        console.log('Ticket Count:', result.length);
                        console.log('Ticket No:', i+1);
                        console.log('Sent Data:', tickets);
                        console.log('Received Data for Ticket:', result[i]);

                        order.mn_pos_tax_errors.push({
                            'mn_pos_tax_errorcode': result[i].errorCode,
                            'mn_pos_tax_message': result[i].message,
                            'mn_pos_tax_sentdata': JSON.stringify(tickets)
                        });

                        self.gui.show_popup('error',{
                            'title': _t('Error at tax system:'),
                            'body': result[i].errorCode + '\n' + result[i].message
                        });

                        console.log(result[i].errorCode + '\n' + result[i].message);

                        continue;
                    }
                    else {
                        if (result[i].lotteryWarningMsg) {
                            console.log('Ticket Count:', result.length);
                            console.log('Ticket No:', i+1);
                            console.log('Sent Data:', tickets);
                            console.log('Received Data for Ticket:', result[i]);
                            console.log('Lottery Warning:', result[i].lotteryWarningMsg);
                            self.gui.show_popup('error',{
                                'title': _t('Error at tax system:'),
                                'body': result[i].lotteryWarningMsg
                            });
                        }

                        if (result[i].taxType === '1') {
                            mn_pos_tax_order_lines = tickets.mn_pos_tax_lines_vat;
                        } else if (result[i].taxType === '2') {
                            mn_pos_tax_order_lines = tickets.mn_pos_tax_lines_vatX;
                        } else if (result[i].taxType === '3') {
                            mn_pos_tax_order_lines = tickets.mn_pos_tax_lines_vatZ;
                        }

                        var mn_pos_tax_order;
                        if (result[i].group) {
                            var sub_bills = result[i].bills,
                                mn_pos_tax_sub_orders = [],
                                seller_tin, seller_tin_length, seller_tin_key;
                            for (var j = 0; j < sub_bills.length; j++) {
                                seller_tin = sub_bills[j].registerNo;
                                seller_tin_length = seller_tin.length;
                                if (seller_tin_length > 7) {
                                    seller_tin_key = seller_tin.slice(seller_tin_length - 8);
                                }
                                else {
                                    seller_tin_key = seller_tin;
                                }
                                seller_tin_key += '_' + sub_bills[j].taxType;
                                mn_pos_tax_sub_orders.push({
                                    'mn_pos_tax_type': sub_bills[j].taxType,
                                    'mn_pos_tax_billtype': sub_bills[j].billType,
                                    'mn_pos_tax_billid': sub_bills[j].billId,
                                    'mn_pos_tax_billdate': new Date(sub_bills[j].date).toUTCString(),
                                    'mn_pos_tax_customerno': sub_bills[j].customerNo,
                                    'mn_pos_tax_customername': (mn_pos_tax_vatpayer ? mn_pos_tax_vatpayer.name : ''),
                                    'mn_pos_tax_order_lines': mn_pos_tax_order_lines[seller_tin_key],

                                    'mn_pos_tax_register_no': sub_bills[j].registerNo,
                                    'seller_id': sub_bills[j].seller_id,
                                });
                            }

                            mn_pos_tax_order = {
                                'dependency': 'batch_bill',
                                'mn_pos_tax_sub_orders': mn_pos_tax_sub_orders,

                                'mn_pos_tax_billtype': result[i].billType,
                                'mn_pos_tax_billid': result[i].billId,
                                'mn_pos_tax_billdate': new Date(result[i].date).toUTCString(),
                                'mn_pos_tax_macaddress': result[i].macAddress,
                                'mn_pos_tax_lotterywarningmsg': result[i].lotteryWarningMsg ? result[i].lotteryWarningMsg : '',
                                'mn_pos_tax_input': '',
                                'mn_pos_tax_output': '',
                                'mn_pos_tax_info': '',
                                'mn_pos_tax_lottery': result[i].lottery,            // only for printing
                                'mn_pos_tax_qrdata': result[i].qrData,              // only for printing
                                'mn_pos_tax_amount': parseFloat(result[i].amount),  // only for printing
                            };
                            order.mn_pos_tax_orders.push(mn_pos_tax_order);
                        }
                        else {
                            mn_pos_tax_order = {
                                'dependency': 'single_bill',

                                'mn_pos_tax_type': result[i].taxType,
                                'mn_pos_tax_billtype': result[i].billType,
                                'mn_pos_tax_billid': result[i].billId,
                                'mn_pos_tax_billdate': new Date(result[i].date).toUTCString(),
                                'mn_pos_tax_customerno': result[i].customerNo,
                                'mn_pos_tax_customername': (mn_pos_tax_vatpayer ? mn_pos_tax_vatpayer.name : ''),
                                'mn_pos_tax_macaddress': result[i].macAddress,
                                'mn_pos_tax_lotterywarningmsg': result[i].lotteryWarningMsg ? result[i].lotteryWarningMsg : '',
                                'mn_pos_tax_input': '',
                                'mn_pos_tax_output': '',
                                'mn_pos_tax_info': '',
                                'mn_pos_tax_lottery': result[i].lottery,            // only for printing
                                'mn_pos_tax_qrdata': result[i].qrData,              // only for printing
                                'mn_pos_tax_amount': parseFloat(result[i].amount),  // only for printing
                                'mn_pos_tax_order_lines': mn_pos_tax_order_lines,
                            };
                            order.mn_pos_tax_orders.push(mn_pos_tax_order);
                        }

                        if (result[i].billType != '3' && !result[i].lottery) {
                            // Input
                            if (result[i].taxType === '1') {
                                mn_pos_tax_order.mn_pos_tax_input = tickets.ticket_vat ? JSON.stringify(tickets.ticket_vat) : '';
                            } else if (result[i].taxType === '2') {
                                mn_pos_tax_order.mn_pos_tax_input = tickets.ticket_vatX ? JSON.stringify(tickets.ticket_vatX) : '';
                            } else if (result[i].taxType === '3') {
                                mn_pos_tax_order.mn_pos_tax_input = tickets.ticket_vatZ ? JSON.stringify(tickets.ticket_vatZ) : '';
                            }

                            // Output
                            mn_pos_tax_order.mn_pos_tax_output = JSON.stringify(result[i]);

                            // Info
                            $.ajax({
                                type: 'GET',
                                async: false,
                                url: proxyURL + '/posapi/getinfo',
                            }).always(function(data, status, error) {
                                mn_pos_tax_order.mn_pos_tax_info = data ? data : '';
                            });
                        }
                    }
                }
            }
        });

        if (order.mn_pos_tax_orders.length < 1) {
            return false;
        }

        return true;
    },
    process_mn_pos_tax_tickets: function(amount_card_total, mn_pos_tax_vatpayer) {
        var order = this.pos.get_order();

        // CustomerNo & BillType
        var billType = '', customerNo = '', reportMonth = '';

        // if (order.is_credit_sales()) {
        //     billType = '5';
        //     customerNo = (mn_pos_tax_vatpayer ? mn_pos_tax_vatpayer.tin : '1000000');
        // }
        // else
        if (mn_pos_tax_vatpayer) {
            if (mn_pos_tax_vatpayer.tin) {
                billType = '3';
                customerNo = mn_pos_tax_vatpayer.tin;
            }
            else if (mn_pos_tax_vatpayer.ebarimt_id) {
                billType = '1';
                customerNo = mn_pos_tax_vatpayer.ebarimt_id;
            }
        }
        else {
            billType = '1';
        }

        if (this.pos.pos_session.mn_pos_tax_register_missed_orders) {
            var date_missed_orders = new Date(this.pos.pos_session.mn_pos_tax_date_missed_orders);
            reportMonth = date_missed_orders.getFullYear().toString() + '-' + getTwoDigitString(date_missed_orders.getMonth() + 1);
        }

        var orderlines_by_taxes = order.get_orderlines_by_taxes(),
            order_lines, oline,
            vat, cct, vat_total, cct_total,
            amount_cash, amount_bank, amount_total,
            mn_pos_tax_type, mn_pos_tax_details, ticket_lines,
            mn_pos_tax_lines, mn_pos_tax_lines_vat = '', mn_pos_tax_lines_vatX = '', mn_pos_tax_lines_vatZ = '',
            ticket, ticket_vat = '', ticket_vatX = '', ticket_vatZ = '', pos_config = this.pos.config,
            sub_tickets = [], mn_pos_tax_lines_seller = {}, ticket_lines_seller,product, category,
            seller, seller_id, seller_tin, seller_tin_key, seller_tin_pattern = /(^[А-ЯЁӨҮ]{2}[0-9]{8}$)|(^\d{7}$)/;
        for (var i = 0; i < orderlines_by_taxes.length; i++) {
            // Ticket lines
            mn_pos_tax_type = orderlines_by_taxes[i].taxtype;
            order_lines = orderlines_by_taxes[i].orderlines;
            vat_total = 0;
            cct_total = 0;
            amount_total = 0;
            mn_pos_tax_lines = [];
            ticket_lines = [];
            ticket_lines_seller = {};
            for (var j = 0; j < order_lines.length; j++) {
                oline = order_lines[j];
                if (oline.get_quantity() <= 0)
                    continue;

                mn_pos_tax_details = oline.get_mn_pos_tax_details(mn_pos_tax_type);
                cct = (mn_pos_tax_details.taxTypeDetails.cct ? mn_pos_tax_details.taxTypeDetails.cct : 0);
                vat = (mn_pos_tax_details.taxTypeDetailsRaw.vat ? mn_pos_tax_details.taxTypeDetailsRaw.vat : 0);

                seller_tin = false;
                seller_id = false;
                if (this.pos.company.mn_pos_tax_multi_sellers) {
                    seller_tin = this.pos.company.vat;
                    if (!seller_tin) {
                        this.gui.show_popup('error',{
                            'title': _t('TIN is required'),
                            'body': _t('Please, set TIN for your company.')
                        });
                        return false;
                    }

                    product = this.pos.db.get_product_by_id(mn_pos_tax_details.productId);
                    if (product.pos_categ_id) {
                        category = this.pos.db.get_category_by_id(product.pos_categ_id[0]);

                        if (category.mn_pos_tax_seller_id) {
                            seller = this.pos.db.get_partner_by_id(category.mn_pos_tax_seller_id[0]);
                            seller_tin = seller.vat;
                            seller_id = seller.id;
                            if (!seller_tin) {
                                this.gui.show_popup('error',{
                                    'title': _t('TIN is required'),
                                    'body': _t('Please, set TIN for the following seller:') + '\n' + seller.name
                                });
                                return false;
                            }
                        }
                    }

                    if (!seller_tin_pattern.test(seller_tin)) {
                        this.gui.show_popup('error',{
                            'title': _t('Not Valid TIN'),
                            'body': _t('This is not a valid TIN. It should be \n a company registry number (e.g. 1234567) or \n an individual\'s registry number (e.g. AA88112233)!')
                        });
                        return false;
                    }

                    if (seller_tin.length > 7) {
                        seller_tin_key = seller_tin.slice(seller_tin.length - 8);
                    }
                    else {
                        seller_tin_key = seller_tin;
                    }
                    seller_tin_key += '_' + mn_pos_tax_type.toString();

                    if (!mn_pos_tax_lines_seller[seller_tin_key]) {
                        mn_pos_tax_lines_seller[seller_tin_key] = [];
                    }
                    if (!ticket_lines_seller[seller_tin]) {
                        ticket_lines_seller[seller_tin] = {
                            lines: [],
                            seller_id: seller_id,
                            vat_total: 0.0,
                            cct_total: 0.0,
                            amount_total: 0.0,
                        };
                    }

                    // Lines to store at backend
                    mn_pos_tax_lines_seller[seller_tin_key].push({
                        'product_id': mn_pos_tax_details.productId,
                        'product_name': mn_pos_tax_details.productName,
                        'product_code': mn_pos_tax_details.productCode,
                        'product_barcode': mn_pos_tax_details.barcode,
                        'product_uom': mn_pos_tax_details.uom_id,
                        'product_qty': mn_pos_tax_details.quantity,
                        'price_unit': mn_pos_tax_details.unitPrice,
                        'tax_ids': mn_pos_tax_details.taxIds,
                    });

                    // Lines to send to VATLS
                    ticket_lines_seller[seller_tin].lines.push({
                        'code': mn_pos_tax_details.productCode,
                        'name': mn_pos_tax_details.productName,
                        'measureUnit': mn_pos_tax_details.uom,
                        'qty': mn_pos_tax_details.quantity.toFixed(2),
                        'unitPrice': mn_pos_tax_details.unitPrice.toFixed(2),
                        'totalAmount': mn_pos_tax_details.priceWithTax.toFixed(2),
                        'cityTax': cct.toFixed(2),
                        'vat': vat.toFixed(2),
                        'barCode': mn_pos_tax_details.barcode
                    });
                    ticket_lines_seller[seller_tin].vat_total += vat;
                    ticket_lines_seller[seller_tin].cct_total += cct;
                    ticket_lines_seller[seller_tin].amount_total += mn_pos_tax_details.priceWithTax;
                }
                else {
                    // Lines to store at backend
                    mn_pos_tax_lines.push({
                        'product_id': mn_pos_tax_details.productId,
                        'product_name': mn_pos_tax_details.productName,
                        'product_code': mn_pos_tax_details.productCode,
                        'product_barcode': mn_pos_tax_details.barcode,
                        'product_uom': mn_pos_tax_details.uom_id,
                        'product_qty': mn_pos_tax_details.quantity,
                        'price_unit': mn_pos_tax_details.unitPrice,
                        'tax_ids': mn_pos_tax_details.taxIds,
                    });

                    // Lines to send to VATLS
                    ticket_lines.push({
                        'code': mn_pos_tax_details.productCode,
                        'name': mn_pos_tax_details.productName,
                        'measureUnit': mn_pos_tax_details.uom,
                        'qty': mn_pos_tax_details.quantity.toFixed(2),
                        'unitPrice': mn_pos_tax_details.unitPrice.toFixed(2),
                        'totalAmount': mn_pos_tax_details.priceWithTax.toFixed(2),
                        'cityTax': cct.toFixed(2),
                        'vat': vat.toFixed(2),
                        'barCode': mn_pos_tax_details.barcode
                    });
                    vat_total += vat;
                    cct_total += cct;
                    amount_total += mn_pos_tax_details.priceWithTax;
                }
            }

            if (this.pos.company.mn_pos_tax_multi_sellers) {
                for (var tin in ticket_lines_seller) {
                    ticket = {
                        'amount': ticket_lines_seller[tin].amount_total.toFixed(2),
                        'vat': ticket_lines_seller[tin].vat_total.toFixed(2),
                        'cashAmount': ticket_lines_seller[tin].amount_total.toFixed(2),
                        'nonCashAmount': '0.00',
                        'cityTax': ticket_lines_seller[tin].cct_total.toFixed(2),
                        'districtCode': pos_config.mn_pos_tax_districtcode,
                        //'posNo': pos_config.mn_pos_tax_posno,
                        'customerNo': customerNo,
                        //'billIdSuffix': '{B!D5FX}',
                        'billType': billType,
                        'taxType': mn_pos_tax_type.toString(),
                        'reportMonth': reportMonth,
                        'branchNo': pos_config.mn_pos_tax_branchno,
                        'stocks': ticket_lines_seller[tin].lines,

                        'registerNo': tin,
                        'seller_id': ticket_lines_seller[tin].seller_id,
                    };

                    vat_total += ticket_lines_seller[tin].vat_total;
                    cct_total += ticket_lines_seller[tin].cct_total;
                    amount_total += ticket_lines_seller[tin].amount_total;

                    sub_tickets.push(ticket);
                }
            }
            else {
                amount_cash = amount_total;
                amount_bank = 0;
                if (amount_card_total > 0) {
                    if (amount_total >= amount_card_total) {
                        amount_bank = amount_card_total;
                        amount_card_total = 0;
                    }
                    else {
                        amount_bank = amount_total;
                        amount_card_total -= amount_total;
                    }
                }
                amount_cash -= amount_bank;

                // Ticket
                ticket = {
                    'amount': amount_total.toFixed(2),
                    'vat': vat_total.toFixed(2),
                    'cashAmount': amount_cash.toFixed(2),
                    'nonCashAmount': amount_bank.toFixed(2),
                    'cityTax': cct_total.toFixed(2),
                    'districtCode': pos_config.mn_pos_tax_districtcode,
                    'posNo': pos_config.mn_pos_tax_posno,
                    'customerNo': customerNo,
                    'billIdSuffix': '{B!D5FX}',
                    'billType': billType,
                    'taxType': mn_pos_tax_type.toString(),
                    'reportMonth': reportMonth,
                    'branchNo': pos_config.mn_pos_tax_branchno,
                    'stocks': ticket_lines,
                };

                if (ticket.taxType === '1') {
                    ticket_vat = ticket;
                    mn_pos_tax_lines_vat = mn_pos_tax_lines;
                }
                else if (ticket.taxType === '2') {
                    ticket_vatX = ticket;
                    mn_pos_tax_lines_vatX = mn_pos_tax_lines;
                }
                else if (ticket.taxType === '3') {
                    ticket_vatZ = ticket;
                    mn_pos_tax_lines_vatZ = mn_pos_tax_lines;
                }
            }
        }

        if (this.pos.company.mn_pos_tax_multi_sellers) {
            ticket = {
                'group': true,
                'vat': vat_total.toFixed(2),
                'amount': amount_total.toFixed(2),
                'billType': sub_tickets[0].billType,
                'billIdSuffix': '{B!D5FX}',
                'posNo': pos_config.mn_pos_tax_posno,
                'bills': sub_tickets,
            };

            ticket_vat = ticket;
            mn_pos_tax_lines_vat = mn_pos_tax_lines_seller;
        }

        return {
            'ticket_vat': ticket_vat,
            'mn_pos_tax_lines_vat': mn_pos_tax_lines_vat,

            'ticket_vatX': ticket_vatX,
            'mn_pos_tax_lines_vatX': mn_pos_tax_lines_vatX,

            'ticket_vatZ': ticket_vatZ,
            'mn_pos_tax_lines_vatZ': mn_pos_tax_lines_vatZ,
        };
    },
    click_set_mn_pos_tax_vatpayer: function() {
        var self = this;

        self.gui.show_popup('mn_pos_tax_vatpayer_popup_widget',{
            'title': _t('Tax Payer'),
        });
    }
});

screens.ReceiptScreenWidget.include({
    render_receipt: function() {
        var self = this;
        this._super();

        $('.mn_pos_tax_qrdata').each(function() {
            var canvas = $(this).children("canvas").get(0);
            var ecl = qrcodegen.QrCode.Ecc.LOW;
            var text = $(this).attr("qrdata");
            var segs = qrcodegen.QrSegment.makeSegments(text);
            var minVer = 7;
            var maxVer = 7;
            var mask = -1;
            var boostEcc = false;
            var qr = qrcodegen.QrCode.encodeSegments(segs, ecl, minVer, maxVer, mask, boostEcc);
            var border = 1;
            var scale = 3;
            qr.drawCanvas(scale, border, canvas);
        });
    },
    print: function() {
        var self = this;
        this._super();

        if (this.pos.get_order()._printed && this.pos.config.mn_pos_tax_hide_lottery_after_first_print) {
            $('.mn_pos_tax_orders').remove();
        }
    },
});

});
