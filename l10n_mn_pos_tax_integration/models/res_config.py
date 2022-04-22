# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError

class ResConfiguration(models.TransientModel):
    #===========================================================================
    # Private fields
    #===========================================================================
    _inherit = 'res.config.settings'

    #===========================================================================
    # Public fields
    #===========================================================================    
    mn_pos_tax_vat_id = fields.Many2one('account.tax', string='VAT',
        required=True, domain="[('type_tax_use', '=', 'sale')]")
    mn_pos_tax_vatx_id = fields.Many2one('account.tax', string='VAT Exempt',
        required=True, domain="[('type_tax_use', '=', 'sale')]")
    mn_pos_tax_vatz_id = fields.Many2one('account.tax', string='VAT 0%',
        required=True, domain="[('type_tax_use', '=', 'sale')]")
    mn_pos_tax_cct_id = fields.Many2one('account.tax', string='CCT',
        required=True, domain="[('type_tax_use', '=', 'sale')]")
    
    mn_pos_tax_return_proxy_ip = fields.Char('IP Address', default='127.0.0.1', 
        required=True, help='IP address of the PosApi Proxy which is used for POS Order Return.', size=45)
    mn_pos_tax_return_proxy_port = fields.Integer('Port', default=48800, 
        required=True, help='Port of the PosApi Proxy which is used for POS Order Return.')
    
    mn_pos_tax_multi_sellers = fields.Boolean('Multi Sellers')
    
    @api.model
    def get_default_mn_pos_tax(self, fields):
        company = self.env.user.company_id
        taxes = self.env['account.tax'].search([
            ('company_id', '=', company.id),
            ('type_tax_use', '=', 'sale'),
            ('mn_pos_tax_type', 'in', ('vat', 'vatx', 'vatz', 'cct'))
        ])
        
        vat_id = False
        vatx_id = False
        vatz_id = False
        cct_id = False
        for tax in taxes:
            if tax.mn_pos_tax_type == 'vat':
                vat_id = tax.id
            elif tax.mn_pos_tax_type == 'vatx':
                vatx_id = tax.id
            elif tax.mn_pos_tax_type == 'vatz':
                vatz_id = tax.id
            elif tax.mn_pos_tax_type == 'cct':
                cct_id = tax.id
        
        return {
            'mn_pos_tax_vat_id': vat_id,
            'mn_pos_tax_vatx_id': vatx_id,
            'mn_pos_tax_vatz_id': vatz_id,
            'mn_pos_tax_cct_id': cct_id,
            
            'mn_pos_tax_return_proxy_ip': company.mn_pos_tax_return_proxy_ip,
            'mn_pos_tax_return_proxy_port': company.mn_pos_tax_return_proxy_port,
            
            'mn_pos_tax_multi_sellers': company.mn_pos_tax_multi_sellers,
        }

    
    def set_mn_pos_tax(self):
        self.ensure_one()

        self.env['account.tax'].write({
            'mn_pos_tax_type': False
        })

        if self.mn_pos_tax_vat_id:
            self.mn_pos_tax_vat_id.mn_pos_tax_type = 'vat'
        if self.mn_pos_tax_vatx_id:
            self.mn_pos_tax_vatx_id.mn_pos_tax_type = 'vatx'
        if self.mn_pos_tax_vatz_id:
            self.mn_pos_tax_vatz_id.mn_pos_tax_type = 'vatz'
        if self.mn_pos_tax_cct_id:
            self.mn_pos_tax_cct_id.mn_pos_tax_type = 'cct'
        
        company = self.env.user.company_id
        company.write({
            'mn_pos_tax_return_proxy_ip': self.mn_pos_tax_return_proxy_ip,
            'mn_pos_tax_return_proxy_port': self.mn_pos_tax_return_proxy_port,
            
            'mn_pos_tax_multi_sellers': self.mn_pos_tax_multi_sellers,
        })