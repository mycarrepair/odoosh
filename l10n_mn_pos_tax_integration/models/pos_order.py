# -*- coding: utf-8 -*-

from odoo import models, fields, api


class PosOrder(models.Model):
    _inherit = 'pos.order'
    
    mn_pos_tax_order_count = fields.Integer(string='VATLS Order Count', compute='_get_mn_pos_tax_orders', readonly=True)
    mn_pos_tax_order_ids = fields.Many2many("mn.pos.tax.order", string='VATLS Orders', compute="_get_mn_pos_tax_orders", readonly=True, copy=False)

    
    @api.depends('state')
    def _get_mn_pos_tax_orders(self):
        for order in self:
            order.mn_pos_tax_order_ids = self.env['mn.pos.tax.order'].search([('pos_order_id', '=', order.id)])
            order.mn_pos_tax_order_count = len(order.mn_pos_tax_order_ids)

    
    def action_mn_pos_tax_orders(self):
        tax_orders = self.mapped('mn_pos_tax_order_ids')
        action = self.env.ref('l10n_mn_pos_tax_integration.mn_pos_tax_order_action').read()[0]
        if len(tax_orders) > 1:
            action['domain'] = [('id', 'in', tax_orders.ids)]
        elif len(tax_orders) == 1:
            action['views'] = [(self.env.ref('l10n_mn_pos_tax_integration.mn_pos_tax_order_view_form').id, 'form')]
            action['res_id'] = tax_orders.ids[0]
        else:
            action = {'type': 'ir.actions.act_window_close'}
        return action

    @api.model
    def _process_order(self, pos_order):
        order = super(PosOrder, self)._process_order(pos_order)
        
        MnPosTaxOrder = self.env['mn.pos.tax.order']
        MnPosTaxOrderLine = self.env['mn.pos.tax.order.line']
        config = order.session_id.config_id
        for mn_pos_tax_order_data in pos_order['mn_pos_tax_orders']:
            if mn_pos_tax_order_data['dependency'] == 'single_bill':
                mn_pos_tax_order = MnPosTaxOrder.create({
                    'pos_order_id': order.id,
                    'date_order': order.date_order,
                    'name': order.name,
                    'bill_no': order.pos_reference,
                    'company_id': order.company_id.id,
                    
                    'dependency': 'single_bill',
                    
                    'mn_pos_tax_districtcode': config.mn_pos_tax_districtcode,
                    'mn_pos_tax_branchno': config.mn_pos_tax_branchno,
                    'mn_pos_tax_posno': config.mn_pos_tax_posno,
                    
                    'mn_pos_tax_type': mn_pos_tax_order_data['mn_pos_tax_type'],
                    'mn_pos_tax_billtype': mn_pos_tax_order_data['mn_pos_tax_billtype'],
                    'mn_pos_tax_billid': mn_pos_tax_order_data['mn_pos_tax_billid'],
                    'mn_pos_tax_billdate': mn_pos_tax_order_data['mn_pos_tax_billdate'],
                    'mn_pos_tax_customerno': mn_pos_tax_order_data['mn_pos_tax_customerno'],
                    'mn_pos_tax_customername': mn_pos_tax_order_data['mn_pos_tax_customername'],
                    'mn_pos_tax_macaddress': mn_pos_tax_order_data['mn_pos_tax_macaddress'],
                    'mn_pos_tax_lotterywarningmsg': mn_pos_tax_order_data['mn_pos_tax_lotterywarningmsg'],
                    'mn_pos_tax_input': mn_pos_tax_order_data['mn_pos_tax_input'],
                    'mn_pos_tax_output': mn_pos_tax_order_data['mn_pos_tax_output'],
                    'mn_pos_tax_info': mn_pos_tax_order_data['mn_pos_tax_info'],
                })
                
                for mn_pos_tax_order_line_data in mn_pos_tax_order_data['mn_pos_tax_order_lines']:
                    MnPosTaxOrderLine.create({
                        'order_id': mn_pos_tax_order.id,
                        
                        'product_id': mn_pos_tax_order_line_data['product_id'],    
                        'product_name': mn_pos_tax_order_line_data['product_name'],                
                        'product_code': mn_pos_tax_order_line_data['product_code'],
                        'product_barcode': mn_pos_tax_order_line_data['product_barcode'],
                        'product_uom': mn_pos_tax_order_line_data['product_uom'],
                        'product_qty': mn_pos_tax_order_line_data['product_qty'],
                        'price_unit': mn_pos_tax_order_line_data['price_unit'],
                        'tax_ids': mn_pos_tax_order_line_data['tax_ids'],
                    })
            elif mn_pos_tax_order_data['dependency'] == 'batch_bill':
                mn_pos_tax_order = MnPosTaxOrder.create({
                    'pos_order_id': order.id,
                    'date_order': order.date_order,
                    'name': order.name,
                    'bill_no': order.pos_reference,
                    'company_id': order.company_id.id,
                    
                    'dependency': 'batch_bill',
                    
                    'mn_pos_tax_districtcode': config.mn_pos_tax_districtcode,
                    'mn_pos_tax_branchno': config.mn_pos_tax_branchno,
                    'mn_pos_tax_posno': config.mn_pos_tax_posno,
                    
                    'mn_pos_tax_billtype': mn_pos_tax_order_data['mn_pos_tax_billtype'],
                    'mn_pos_tax_billid': mn_pos_tax_order_data['mn_pos_tax_billid'],
                    'mn_pos_tax_billdate': mn_pos_tax_order_data['mn_pos_tax_billdate'],
                    'mn_pos_tax_macaddress': mn_pos_tax_order_data['mn_pos_tax_macaddress'],
                    'mn_pos_tax_lotterywarningmsg': mn_pos_tax_order_data['mn_pos_tax_lotterywarningmsg'],
                    'mn_pos_tax_input': mn_pos_tax_order_data['mn_pos_tax_input'],
                    'mn_pos_tax_output': mn_pos_tax_order_data['mn_pos_tax_output'],
                    'mn_pos_tax_info': mn_pos_tax_order_data['mn_pos_tax_info'],
                })

                mn_pos_tax_sub_orders = mn_pos_tax_order_data['mn_pos_tax_sub_orders']
                for mn_pos_tax_sub_order_data in mn_pos_tax_sub_orders:
                    mn_pos_tax_sub_order = MnPosTaxOrder.create({
                        'pos_order_id': order.id,
                        'date_order': order.date_order,
                        'name': order.name,
                        'bill_no': order.pos_reference,
                        'company_id': order.company_id.id,
                        
                        'dependency': 'sub_bill',
                        'batch_bill_id': mn_pos_tax_order.id,
                        'seller_id': mn_pos_tax_sub_order_data['seller_id'],
                        'mn_pos_tax_register_no': mn_pos_tax_sub_order_data['mn_pos_tax_register_no'],
                        
                        'mn_pos_tax_districtcode': config.mn_pos_tax_districtcode,
                        'mn_pos_tax_branchno': config.mn_pos_tax_branchno,
                        'mn_pos_tax_posno': config.mn_pos_tax_posno,
                        
                        'mn_pos_tax_type': mn_pos_tax_sub_order_data['mn_pos_tax_type'],
                        'mn_pos_tax_billtype': mn_pos_tax_sub_order_data['mn_pos_tax_billtype'],
                        'mn_pos_tax_billid': mn_pos_tax_sub_order_data['mn_pos_tax_billid'],
                        'mn_pos_tax_billdate': mn_pos_tax_sub_order_data['mn_pos_tax_billdate'],
                        'mn_pos_tax_customerno': mn_pos_tax_sub_order_data['mn_pos_tax_customerno'],
                        'mn_pos_tax_customername': mn_pos_tax_sub_order_data['mn_pos_tax_customername'],
                    })
                    
                    for mn_pos_tax_order_line_data in mn_pos_tax_sub_order_data['mn_pos_tax_order_lines']:
                        MnPosTaxOrderLine.create({
                            'order_id': mn_pos_tax_sub_order.id,
                            
                            'product_id': mn_pos_tax_order_line_data['product_id'],    
                            'product_name': mn_pos_tax_order_line_data['product_name'],                
                            'product_code': mn_pos_tax_order_line_data['product_code'],
                            'product_barcode': mn_pos_tax_order_line_data['product_barcode'],
                            'product_uom': mn_pos_tax_order_line_data['product_uom'],
                            'product_qty': mn_pos_tax_order_line_data['product_qty'],
                            'price_unit': mn_pos_tax_order_line_data['price_unit'],
                            'tax_ids': mn_pos_tax_order_line_data['tax_ids'],
                        })
                
        MnPosTaxError = self.env['mn.pos.tax.error']
        for mn_pos_tax_error_data in pos_order['mn_pos_tax_errors']:
            MnPosTaxError.create({
                'pos_order_id': order.id,
                
                'mn_pos_tax_errorcode': mn_pos_tax_error_data['mn_pos_tax_errorcode'],
                'mn_pos_tax_message': mn_pos_tax_error_data['mn_pos_tax_message'],
                'mn_pos_tax_sentdata': mn_pos_tax_error_data['mn_pos_tax_sentdata']
            })
            
        return order