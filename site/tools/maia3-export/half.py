# Store big float weights as fp16 and cast them back to fp32 at load: half the download, same math in fp32.
import sys, onnx, numpy as np
from onnx import numpy_helper, helper, TensorProto
src, dst = sys.argv[1], sys.argv[2]
m = onnx.load(src)
g = m.graph
new_inits, casts = [], []
for init in g.initializer:
    a = numpy_helper.to_array(init)
    if a.dtype == np.float32 and a.size >= 1024:
        h = numpy_helper.from_array(a.astype(np.float16), init.name + '__f16')
        new_inits.append(h)
        casts.append(helper.make_node('Cast', [init.name + '__f16'], [init.name], to=TensorProto.FLOAT, name='cast_' + init.name))
    else:
        new_inits.append(init)
del g.initializer[:]
g.initializer.extend(new_inits)
nodes = list(g.node)
del g.node[:]
g.node.extend(casts + nodes)
onnx.checker.check_model(m)
onnx.save(m, dst)
print(dst, len(casts), 'weights halved')
