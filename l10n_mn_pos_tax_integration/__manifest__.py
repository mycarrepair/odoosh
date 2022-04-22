# -*- coding: utf-8 -*-

{
    'name': 'POS Integration to Mongolian Tax System',
    'summary': '''
        It integrates Point of Sale to Mongolian Tax System''',

    'author': 'My Car Repair',
    # 'license': 'OEEL-1',

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/master/odoo/addons/base/module/module_data.xml
    # for the full list
    'category': 'Sales/Point Of Sale',
    'version': '14.0.1.2',
    'application': False,
    'installable': True,
    'auto_install': False,

    # any module necessary for this one to work correctly
    'depends': [
        'point_of_sale',
    ],

    # always loaded
    'data': [
        'security/ir.model.access.csv',        
        
        'data/mn_pos_tax_universal_category_code.xml',
        'data/mn_pos_tax_vatx_product_code.xml',
        'data/mn_pos_tax_vatz_product_code.xml',
        
        'views/res_config.xml',
        'views/pos_config.xml',
        'views/pos_category.xml',
        'views/pos_session.xml',
        'views/pos_order.xml',
        'views/product_template.xml',
        
        'views/mn_pos_tax_universal_category_code.xml',
        'views/mn_pos_tax_vatx_product_code.xml',
        'views/mn_pos_tax_vatz_product_code.xml',
        'views/mn_pos_tax_order.xml',
        
        # 'templates/l10n_mn_pos_tax_integration.xml',
    ],
    'qweb': [
        # 'static/src/xml/l10n_mn_pos_tax_integration.xml',
    ],   
}