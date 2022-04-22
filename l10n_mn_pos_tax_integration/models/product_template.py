# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError

class ProductTemplate(models.Model):
    #===========================================================================
    # Private fields
    #===========================================================================
    _inherit = 'product.template'
    
    #===========================================================================
    # Public fields
    #===========================================================================
    mn_pos_tax_universal_category_code_id = fields.Many2one('mn.pos.tax.universal.category.code', 
        string='Universal Category Code')
    mn_pos_tax_vatx_product_code_id = fields.Many2one('mn.pos.tax.vatx.product.code',
        string='VAT Exempt Product Code')
    mn_pos_tax_vatz_product_code_id = fields.Many2one('mn.pos.tax.vatz.product.code',
        string='VAT 0% Product Code')
    
    #===========================================================================
    # CRUD methods
    #===========================================================================
    '''
    @api.model
    def create(self, vals):
        product = super(ProductTemplate, self).create(vals)
    
        if product.sale_ok and product.available_in_pos:
            self._check_taxes(taxes=product.taxes_id)

            for variant in product.product_variant_ids:
                self._validate_gs1_barcode(barcode=variant.barcode, taxes=product.taxes_id,
                    universal_code=product.mn_pos_tax_universal_category_code_id,
                    vatx_code=product.mn_pos_tax_vatx_product_code_id,
                    vatz_code = product.mn_pos_tax_vatz_product_code_id)
        
        return product
    
    
    def write(self, vals):
        res = super(ProductTemplate, self).write(vals)

        if res and self.sale_ok and self.available_in_pos:
            self._check_taxes(taxes=self.taxes_id)
            
            for variant in self.product_variant_ids:
                self._validate_gs1_barcode(barcode=variant.barcode, taxes=self.taxes_id,
                    universal_code=self.mn_pos_tax_universal_category_code_id,
                    vatx_code=self.mn_pos_tax_vatx_product_code_id,
                    vatz_code=self.mn_pos_tax_vatz_product_code_id)
        
        return res
    '''
    
    def _check_taxes(self, taxes):
        vat = False
        vatx = False
        vatz = False
        cct = False
        for tax in taxes:
            if tax.mn_pos_tax_type == 'vat':
                vat = tax
            elif tax.mn_pos_tax_type == 'vatx':
                vatx = tax
            elif tax.mn_pos_tax_type == 'vatz':
                vatz = tax
            elif tax.mn_pos_tax_type == 'cct':
                cct = tax

        if vat and vatx:
            raise ValidationError(_('A product can not have both \"%s\" and \"%s\" taxes. Choose only one of them.') % (vat.name, vatx.name))
        elif vat and vatz:
            raise ValidationError(_('A product can not have both \"%s\" and \"%s\" taxes. Choose only one of them.') % (vat.name, vatz.name))
        elif vatx and vatz:
            raise ValidationError(_('A product can not have both \"%s\" and \"%s\" taxes. Choose only one of them.') % (vatx.name, vatz.name))
        elif cct and vatx:
            raise ValidationError(_('A product can not have both \"%s\" and \"%s\" taxes. Choose only one of them.') % (cct.name, vatx.name))
        elif cct and vatz:
            raise ValidationError(_('A product can not have both \"%s\" and \"%s\" taxes. Choose only one of them.') % (cct.name, vatz.name))
        
    # Validation reference:
    #   https://www.gs1.org/check-digit-calculator
    #   https://www.gs1.org/how-calculate-check-digit-manually
    def _validate_gs1_barcode(self, barcode, taxes, universal_code, vatx_code, vatz_code):
        other_code_name = False
        vat = False
        vat_exempt = False
        vat_zero = False
        for tax in taxes:
            if tax.mn_pos_tax_type == 'vat':
                vat = tax
            elif tax.mn_pos_tax_type == 'vatx':
                vat_exempt = tax
            elif tax.mn_pos_tax_type == 'vatz':
                vat_zero = tax
        if vat and not universal_code:
            other_code_name = _('\"Universal Category Code\"')
        elif vat_exempt and not vatx_code:
            other_code_name = _('\"VAT Exempt Product Code\"')
        elif vat_zero and not vatz_code:
            other_code_name = _('\"VAT 0% Product Code\"')
                
        if other_code_name:
            if not barcode:
                raise ValidationError(_('If product has no barcode, please select a proper %s for this product.') % other_code_name)

            select_other_code = _('If product has no valid GS1 barcode, please select a proper %s for this product.') % other_code_name
            if not barcode.isdigit():
                raise ValidationError(_('Barcode must be a number.') + ' ' + select_other_code)

            not_valid_gs1 = _('The number you entered is not a valid GS1 barcode.')
            length = len(barcode)
            if length < 8:
                raise ValidationError(not_valid_gs1 + ' ' + _('It is too short.') + ' ' + select_other_code)
            elif length > 18:
                raise ValidationError(not_valid_gs1 + ' ' + _('It is too long.') + ' ' + select_other_code)
            elif length not in (8, 12, 13, 14, 17, 18):
                raise ValidationError(not_valid_gs1 + ' ' + _('Barcode length is incorrect.') + ' ' + select_other_code)

            # GS1 barcode validation
            index = len(barcode) - 1
            last_digit = int(barcode[index])
            digit_sum = 0
            count = 1
            index -= 1
            while index >= 0:
                digit = int(barcode[index])
                digit_sum += digit if count % 2 == 0 else digit * 3
                count += 1
                index -= 1

            higher_ten_divisible = int(digit_sum / 10) * 10 + 10
            check_digit = higher_ten_divisible - digit_sum

            if last_digit != check_digit:
                raise ValidationError(_('Barcode does not meet the GS1 standard.') + ' ' + select_other_code)        