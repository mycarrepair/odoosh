# -*- coding: utf-8 -*-

from odoo import models, fields

class Company(models.Model):
    #===========================================================================
    # Private fields
    #===========================================================================
    _inherit = "res.company"

    #===========================================================================
    # Public fields
    #===========================================================================
    mn_pos_tax_return_proxy_ip = fields.Char('IP Address', default='127.0.0.1', size=45,
        help='IP address of the PosApi Proxy which is used for POS Order Return.')
    mn_pos_tax_return_proxy_port = fields.Integer('Port', default='8050',
        help='Port of the PosApi Proxy which is used for POS Order Return.')
    
    mn_pos_tax_multi_sellers = fields.Boolean('Multi Sellers')