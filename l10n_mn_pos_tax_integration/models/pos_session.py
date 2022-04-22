# -*- coding: utf-8 -*-

from dateutil.relativedelta import relativedelta

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError

class PosSession(models.Model):
    #===========================================================================
    # Private fields
    #===========================================================================
    _inherit = 'pos.session'
    
    #===========================================================================
    # Public fields
    #===========================================================================
    mn_pos_tax_register_missed_orders = fields.Boolean(string='Register Missed Orders',
        help='Allows to register missed orders for the previous month')
    mn_pos_tax_date_missed_orders = fields.Date(string='Date for Missed Orders',
        help='It should be a date within the range of previous month')
    
    
    #===========================================================================
    # Constraint methods
    #===========================================================================
    
    @api.constrains('mn_pos_tax_register_missed_orders', 'mn_pos_tax_date_missed_orders')
    def _check_mn_pos_tax_missed_orders(self):
        self.ensure_one
        
        error_message = _('Date for Missed Orders should be within the range of previous month!')        
        if self.mn_pos_tax_register_missed_orders:
            date_missed_orders = self.mn_pos_tax_date_missed_orders 
            if not date_missed_orders:
                raise ValidationError(error_message)
            
            date_missed_orders = fields.Date.from_string(date_missed_orders)
            date_current = fields.Date.from_string(fields.Date.context_today(self))
            date_prev_month = date_current - relativedelta(months=1)            
            
            if not date_missed_orders.year == date_prev_month.year or not date_missed_orders.month == date_prev_month.month:
                raise ValidationError(error_message)