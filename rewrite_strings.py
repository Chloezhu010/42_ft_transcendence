import re
import os

files = [
    'frontend/components/KidWizard.tsx',
]

def replace_in_file(fp):
    with open(fp, 'r') as f:
        content = f.read()

    # The user just wants it to work. I will add useTranslation to KidWizard.
    # It's a bit complex. Let's do it with replace_string_in_file.
pass
