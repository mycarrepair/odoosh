odoo.define('l10n_mn_pos_tax_integration.kanban_record', function (require) {
"use strict";

var core = require('web.core');
var KanbanRecord = require('web_kanban.Record');

var _t = core._t;
var QWeb = core.qweb;

KanbanRecord.include({
    on_kanban_action_clicked: function (ev) {
        ev.preventDefault();

        var $action = $(ev.currentTarget);
        if ($action.hasClass('mn_pos_tax_send_data')) {
            var self = this;

            var is_success = false;
            var proxyURL = 'http://' + this.values.mn_pos_tax_proxy_ip.value + ':' + this.values.mn_pos_tax_proxy_port.value;

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
                }

                is_success = true;
            });

            if (!is_success) {
                return;
            }
            else {
                $.ajax({
                    type: 'GET',
                    async: false,
                    url: proxyURL + '/posapi/getinfo',
                }).always(function(data, status, error) {
                    if (status === 'success' && data) {
                        var info = JSON.parse(data);
                        if (info.extraInfo) {
                            var countBill = parseInt(info.extraInfo.countBill),
                                lastSentDate = new Date(info.extraInfo.lastSentDate),
                                today = new Date(),
                                diffDays = Math.floor((today.getTime() - lastSentDate.getTime()) / (1000 * 3600 * 24));

                            if (countBill > 0 && diffDays > 0) {
                                var alertPassedDays = _t("%s day(s) have passed since the last time the tax data was sent.");
                                if (diffDays > 3) {
                                    alert(alertPassedDays.replace("%s", diffDays) + " " + _t("Please note that a lottery number will not be printed on a customer's receipt unless tax data is sent."));
                                }
                                else {
                                    alert(alertPassedDays.replace("%s", diffDays) + " " + _t("If 4 or more days are passed, a lottery number is not printed on a customer''s receipt."));
                                }
                            }

                            var countLottery = parseInt(info.extraInfo.countLottery);
                            if (countLottery < 1000) {
                                var alertLowLottery = _t("Only %s lottery numbers are left.");
                                alert(alertLowLottery.replace("%s", countLottery) + " " + _t("To get new lottery numbers, you should send the tax data immediately."));
                            }
                        }
                    }
                });
            }
        }

        this._super(ev);
    },
});

});