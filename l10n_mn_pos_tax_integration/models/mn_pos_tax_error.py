# -*- coding: utf-8 -*-

from odoo import models, fields

class PosTaxError(models.Model):
    #===========================================================================
    # Private fields
    #===========================================================================
    _name = 'mn.pos.tax.error'
    _description = 'Errors received from Mongolian Tax System'
    
    #===========================================================================
    # Public fields
    #===========================================================================
    pos_order_id = fields.Many2one('pos.order', string='POS Order',
        required=True, readonly=True, copy=False, ondelete='restrict')

    mn_pos_tax_errorcode = fields.Char(string='VATLS Error Code', 
        required=True, readonly=True)
    mn_pos_tax_message = fields.Char(string='VATLS Error Message',
        required=True, readonly=True)
    mn_pos_tax_sentdata = fields.Text('VATLS Sent Data',
        required=True, readonly=True)