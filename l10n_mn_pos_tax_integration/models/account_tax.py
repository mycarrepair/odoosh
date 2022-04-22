# -*- coding: utf-8 -*-

from odoo import models, fields

class AccountTax(models.Model):
    #===========================================================================
    # Private fields
    #===========================================================================
    _inherit = 'account.tax'
    
    #===========================================================================
    # Public fields
    #===========================================================================
    mn_pos_tax_type = fields.Selection([
        ('vat', 'VAT'),
        ('vatx', 'VAT Exempt'),
        ('vatz', 'VAT 0%'),
        ('cct', 'Capital City Tax'),
    ], string='Mongolian POS Tax Type', readonly=True, copy=False)
    
    _sql_constraints = [
        ('mn_pos_tax_type_uniq', 'unique(mn_pos_tax_type, company_id)', 'Mongolian POS Tax Type should be unique!')
    ]