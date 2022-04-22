# -*- coding: utf-8 -*-

from odoo import models, fields, api
from odoo.osv import expression

class UniversalCategoryCode(models.Model):
    #===========================================================================
    # Private fields
    #===========================================================================
    _name = 'mn.pos.tax.universal.category.code'
    _description = 'Universal Category Code'

    #===========================================================================
    # Public fields
    #===========================================================================
    code = fields.Char(string='Code', required=True, readonly=True, size=7)
    name = fields.Char(string='Name', required=True, readonly=True)

    #===========================================================================
    # Search methods
    #===========================================================================
    @api.model
    def name_search(self, name, args=None, operator='ilike', limit=100):
        args = args or []
        domain = []
        if name:
            domain = ['|', ('code', '=ilike', name + '%'), ('name', operator, name)]
            if operator in expression.NEGATIVE_TERM_OPERATORS:
                domain = ['&', '!'] + domain[1:]
        accounts = self.search(domain + args, limit=limit)
        return accounts.name_get()

    
    @api.depends('name', 'code')
    def name_get(self):
        res = []
        for record in self:
            name = record.name
            if len(name) > 50:
                name = record.code + ' ' + name[:50] + '...'
            else:
                name = record.code + ' ' + name
            res.append((record.id, name))
        return res