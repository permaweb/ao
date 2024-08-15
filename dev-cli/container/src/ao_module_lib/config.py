import os
import sys
import yaml
from ao_module_lib.helper import debug_print

def mb_to_bytes(megabytes):
    return megabytes * 1024 * 1024

presets = {
    'xs': {
        'stack_size': mb_to_bytes(8),
        'initial_memory': mb_to_bytes(16),
        'maximum_memory': mb_to_bytes(64) 
    },
    'sm': {
        'stack_size': mb_to_bytes(16), 
        'initial_memory': mb_to_bytes(32),  
        'maximum_memory': mb_to_bytes(128) 
    },
    'md': {
        'stack_size': mb_to_bytes(32),
        'initial_memory': mb_to_bytes(48), 
        'maximum_memory': mb_to_bytes(256)
    },
    'lg': {
        'stack_size': mb_to_bytes(48), 
        'initial_memory': mb_to_bytes(64), 
        'maximum_memory': mb_to_bytes(256)
    },
    'xl': {
        'stack_size': mb_to_bytes(64), 
        'initial_memory': mb_to_bytes(96), 
        'maximum_memory': mb_to_bytes(512)
    },
    'xxl': {
        'stack_size': mb_to_bytes(96), 
        'initial_memory': mb_to_bytes(128), 
        'maximum_memory': mb_to_bytes(4096)
    },
}

class Config():
    preset = 'md'
    stack_size = 0
    initial_memory = 0
    maximum_memory = 0
    extra_compile_args = []
    keep_js = False
    target = 64

    def __init__(self, config_file):
        
        if not os.path.isfile(config_file):
            debug_print('{} does not exist. need to place it'.format(config_file))
            debug_print('Defaulting to preset: {}'.format(self.preset))
            self.setValuesByPreset(self.preset)
            return

        with open(config_file, mode='r') as config:
            data = yaml.safe_load(config)
            if data is None:
                print('No data in config file. Defaulting to preset: {}'.format(self.preset))
                self.setValuesByPreset(self.preset)
            else:
                self.preset = data.get('preset', self.preset)
                self.setValuesByPreset(self.preset)
                # Overwrite the preset values if they are provided
                self.stack_size = data.get('stack_size', self.stack_size)
                self.initial_memory = data.get('initial_memory', self.initial_memory)
                self.maximum_memory = data.get('maximum_memory', self.maximum_memory)
                self.extra_compile_args = data.get('extra_compile_args', self.extra_compile_args)
                self.keep_js = data.get('keep_js', self.keep_js)
                self.setTarget(data.get('target', self.target))
  

    def setTarget(self, value):
        if(not isinstance(value, int) and not isinstance(value, str)):
            print('Invalid target. Defaulting to 64 bit')
            value = 64
        else:
            if(isinstance(value, str)):
                value = int(value)
            if(value != 64 and value != 32):
                print('Invalid target. Defaulting to 64 bit')
                value = 64
        self.target = value

    def setValuesByPreset(self, preset):
        self.preset = preset
        self.stack_size = presets[self.preset]['stack_size']
        self.initial_memory = presets[self.preset]['initial_memory']
        self.maximum_memory = presets[self.preset]['maximum_memory']
        
    def get_extra_args(self):
        args = []
        for val in self.extra_compile_args:
            args.extend(['{}'.format(val)])
        debug_print('Extra compile args: {}'.format(args))
        return args