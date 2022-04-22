# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
import odoo.addons.decimal_precision as dp

class PosTaxOrder(models.Model):
    #===========================================================================
    # Private fields
    #===========================================================================
    _name = 'mn.pos.tax.order'
    _rec_name = 'mn_pos_tax_billid'
    _description = 'POS Orders sent to Mongolian Tax System'
    _order = 'date_order desc, id desc'    
    
    #===========================================================================
    # Public fields
    #===========================================================================
    pos_order_id = fields.Many2one('pos.order', string='POS Order',
        required=True, readonly=True, copy=False, ondelete='restrict')
    
    date_order = fields.Datetime(string='Order Date', required=True, readonly=True)
    name = fields.Char(string='Order Ref', required=True, readonly=True)
    bill_no = fields.Char(string='Receipt Ref', required=True, readonly=True)
    company_id = fields.Many2one('res.company', string='Company', required=True, readonly=True)
    user_id = fields.Many2one('res.users', related='pos_order_id.user_id',
        string='Cashier', required=True, readonly=True)
    session_id = fields.Many2one('pos.session', related='pos_order_id.session_id',
        string='Session', readonly=True)
    pricelist_id = fields.Many2one('product.pricelist', related='pos_order_id.pricelist_id',
        string='Pricelist', required=True, readonly=True)
    currency_id = fields.Many2one("res.currency", related='pricelist_id.currency_id',
        string="Currency", required=True, readonly=True)
    partner_id = fields.Many2one('res.partner', related='pos_order_id.partner_id',
        string='Customer', readonly=True)
    fiscal_position_id = fields.Many2one('account.fiscal.position', related='pos_order_id.fiscal_position_id',
        string='Fiscal Position', readonly=True)
    state = fields.Selection([
        ('added', 'Added'), 
        ('editing', 'Editing'),
        ('edited', 'Edited'),
        ('cancel', 'Cancelled'),
    ], string='Status', readonly=True, copy=False, default='added')

    dependency = fields.Selection([
        ('single_bill', 'Single Bill'),
        ('batch_bill', 'Batch Bill'),
        ('sub_bill', 'Sub Bill'),
    ], string='Dependency', readonly=True, copy=False, default='single_bill')
    batch_bill_id = fields.Many2one('mn.pos.tax.order', string='Batch Bill', copy=False)
    sub_bill_ids = fields.One2many('mn.pos.tax.order', 'batch_bill_id', string='Sub Bills')
    seller_id = fields.Many2one('res.partner', string="Seller")
    
    mn_pos_tax_register_no = fields.Char(string='Register No')

    mn_pos_tax_return_proxy_ip = fields.Char(string='IP Address',
        related='company_id.mn_pos_tax_return_proxy_ip', readonly=True)
    mn_pos_tax_return_proxy_port = fields.Integer(string='Port',
        related='company_id.mn_pos_tax_return_proxy_port', readonly=True)

    mn_pos_tax_districtcode = fields.Char(string='District Code', readonly=True, copy=False)
    mn_pos_tax_branchno = fields.Char(string='Branch No', readonly=True, copy=False)
    mn_pos_tax_posno = fields.Char(string='Pos No', readonly=True, copy=False)

    mn_pos_tax_type = fields.Selection([
        ('1', 'VAT'),
        ('2', 'VAT Exempt'),
        ('3', 'VAT 0%'),
        ], string='Tax Type', required=True, readonly=True, copy=False, default='1')
    mn_pos_tax_billtype = fields.Selection([
        ('1', 'Business to Individual'),
        ('3', 'Business to Business'),
        ('5', 'Invoice'),
        ], string='Bill Type', required=True, readonly=True, default='1')
    mn_pos_tax_billid = fields.Char(string='PUID', readonly=True, index=True)
    mn_pos_tax_billdate = fields.Datetime(string='Tax Date', required=True, readonly=True, index=True)
    mn_pos_tax_customerno = fields.Char(string='Customer TIN', readonly=True, copy=False)
    mn_pos_tax_customername = fields.Char(string='Customer Name', readonly=True, copy=False)
    mn_pos_tax_districtcode = fields.Char(string='District Code', readonly=True, copy=False)
    mn_pos_tax_macaddress = fields.Char(string='MAC Address', readonly=True, copy=False)
    mn_pos_tax_lotterywarningmsg = fields.Char(string='Lottery Warning', readonly=True)
    mn_pos_tax_input = fields.Char(string='Input', readonly=True, copy=False)
    mn_pos_tax_output = fields.Char(string='Output', readonly=True, copy=False)
    mn_pos_tax_info = fields.Char(string='Info', readonly=True, copy=False)
    mn_pos_tax_order_lines = fields.One2many('mn.pos.tax.order.line', 'order_id', string='Order Lines')

    mn_pos_tax_previous_billid = fields.Char(string='Previous PUID', readonly=True)
    mn_pos_tax_edit_count = fields.Integer(string='Edit Count', readonly=True, default=0)    

    total_without_tax = fields.Monetary(compute='_compute_total', string='Total w/o tax', store=True)
    total_vat = fields.Monetary(compute='_compute_total', string='Total VAT', store=True)
    total_cct = fields.Monetary(compute='_compute_total', string='Total CCT', store=True)
    total = fields.Monetary(compute='_compute_total', string='Total', store=True)

    #===========================================================================
    # Compute methods
    #===========================================================================
    @api.depends('mn_pos_tax_order_lines.subtotal', 'sub_bill_ids.total')
    def _compute_total(self):
        for order in self:
            total_without_tax = total_vat = total_cct = total = 0.0
            if order.dependency == 'batch_bill':
                for sub_order in order.sub_bill_ids:
                    total_without_tax += sub_order.total_without_tax
                    total_vat += sub_order.total_vat
                    total_cct += sub_order.total_cct
                    total += sub_order.total
            else:
                for line in order.mn_pos_tax_order_lines:
                    total_without_tax += line.subtotal_without_tax
                    total_vat += line.subtotal_vat
                    total_cct += line.subtotal_cct
                    total += line.subtotal
                    
            order.update({
                'total_without_tax': total_without_tax,
                'total_vat': total_vat,
                'total_cct': total_cct,
                'total': total,
            })

    #===========================================================================
    # CRUD methods
    #===========================================================================
    
    def write(self, vals):        
        current_date = fields.Date.from_string(fields.Date.context_today(self))
        current_months = (current_date.year - 1) * 12 + current_date.month
        billdate = fields.Datetime.context_timestamp(self, fields.Datetime.from_string(self.mn_pos_tax_billdate))
        billdate_months = (billdate.year - 1) * 12 + billdate.month

        if current_months - billdate_months > 1:
            raise ValidationError(_('You can not edit or cancel a document which is more than one month old.'))

        if self.dependency == 'batch_bill':
            return super(PosTaxOrder, self).write(vals)

        if 'mn_pos_tax_billid' in vals:
            self.mn_pos_tax_previous_billid = self.mn_pos_tax_billid

        super(PosTaxOrder, self).write(vals)

        lines_count = len(self.mn_pos_tax_order_lines)
        if (lines_count < 1):
            raise ValidationError(_('When you are editing, you can not delete all lines. To fully return, just cancel the order.'))

        mn_pos_tax_vals = {}
        if 'state' not in vals:
            if self.state in ('added', 'edited') and 'mn_pos_tax_order_lines' in vals:
                mn_pos_tax_vals['state'] = 'editing'
                if self.dependency == 'sub_bill' and self.batch_bill_id.state != 'editing':
                    self.batch_bill_id.state = 'editing'
            elif self.state == 'editing' and 'mn_pos_tax_billid' in vals:
                mn_pos_tax_vals['state'] = 'edited'
                if self.dependency == 'sub_bill' and not any(s.id != self.id and s.state == 'editing' for s in self.batch_bill_id.sub_bill_ids):
                    self.batch_bill_id.state = 'edited'
        else:
            if self.dependency == 'sub_bill' and not any(s.state != 'cancel' for s in self.batch_bill_id.sub_bill_ids):
                self.batch_bill_id.state = 'cancel'
                        
        return super(PosTaxOrder, self).write(mn_pos_tax_vals)

    
    def unlink(self):
        raise ValidationError(_('You can not delete a VATLS order. Either edit or cancel it.'))
        return super(PosTaxOrder, self).unlink()

    #===========================================================================
    # Business methods
    #===========================================================================
    
    def open_record(self):
        return {
                'type': 'ir.actions.act_window',
                #'name': 'title',
                'res_model': 'mn.pos.tax.order',
                'res_id': self.id,
                'view_type': 'form',
                'view_mode': 'form',
                #'view_id': form_id.id,
                #'context': {},  
                #'flags': {'initial_mode': 'edit'},
                'target': 'current',
            }

class PosTaxOrderLine(models.Model):
    _name = 'mn.pos.tax.order.line'
    _description = 'POS Order Lines sent to Mongolian Tax System'

    order_id = fields.Many2one('mn.pos.tax.order',
        string='Order Ref', required=True, readonly=True, copy=False, ondelete='cascade')
    currency_id = fields.Many2one("res.currency", related='order_id.currency_id',
        string="Currency", readonly=True)

    product_id = fields.Many2one('product.product', required=True, readonly=True,
        string='Product', domain=[('sale_ok', '=', True)], change_default=True, ondelete='restrict')
    product_name = fields.Char(string='Product Name', readonly=True, copy=False)
    product_code = fields.Char(string='Product Code', readonly=True, copy=False)
    product_barcode = fields.Char(string='Product Barcode', readonly=True, copy=False)
    product_uom = fields.Char(string='Product UoM', readonly=True, copy=False)

    product_qty = fields.Float(string='Qty', required=True,
        digits=dp.get_precision('Product Unit of Measure'), default=1.0)
    price_unit = fields.Float(string='Unit Price', required=True, readonly=True,
        digits=dp.get_precision('Product Price'), default=0.0)
    tax_ids = fields.Many2many('account.tax', string='Taxes',
        domain=['|', ('active', '=', False), ('active', '=', True)])

    subtotal_without_tax = fields.Float(compute='_compute_subtotal', string='Subtotal w/o tax', store=True)
    subtotal_vat = fields.Float(compute='_compute_subtotal', string='VAT', store=True)
    subtotal_cct = fields.Float(compute='_compute_subtotal', string='CCT', store=True)
    subtotal = fields.Float(compute='_compute_subtotal', string='Subtotal', store=True)

    #===========================================================================
    # Compute methods
    #===========================================================================
    @api.depends('product_qty', 'price_unit')
    def _compute_subtotal(self):
        for line in self:
            price = line.price_unit
            all_taxes = line.tax_ids.compute_all(price, line.order_id.currency_id, line.product_qty,
                                                 product=line.product_id, partner=line.order_id.partner_id)            
            Tax = self.env['account.tax']
            tax_amount = {
                'vat': 0.0,
                'cct': 0.0,
            }            
            for tax_calc in all_taxes['taxes']:
                tax = Tax.browse(tax_calc['id'])
                if tax.mn_pos_tax_type:
                    tax_amount[tax.mn_pos_tax_type] = tax_calc['amount']         

            line.update({
                'subtotal_without_tax': all_taxes['total_excluded'],
                'subtotal_vat': tax_amount['vat'],
                'subtotal_cct': tax_amount['cct'],
                'subtotal': all_taxes['total_included'],
            })

    #===========================================================================
    # Constraint methods
    #===========================================================================
    
    @api.constrains('product_qty')
    def _check_product_qty(self):
        for line in self:
            if line.product_qty < 0.000:
                raise ValidationError(
                    _('\"%s\" product quantity must be greater than 0.') % 
                      line.product_id.product_tmpl_id.partner_ref)