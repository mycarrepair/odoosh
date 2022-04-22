# -*- coding: utf-8 -*-

from odoo import models, fields, api


class PosCategory(models.Model):
    _inherit = 'pos.category'

    mn_pos_tax_seller_id = fields.Many2one('res.partner', 'Seller')
    mn_pos_tax_multi_sellers = fields.Boolean(string='Multi Sellers', compute='_compute_multi_sellers')

    
    def _compute_multi_sellers(self):
        for category in self:
            category.mn_pos_tax_multi_sellers = self.env.user.company_id.mn_pos_tax_multi_sellers