import sys; sys.path.insert(0, '/tmp/m3/src')
import torch, m3model
size = sys.argv[1]
m = m3model.load(f'/tmp/m3/dl/maia3-{size}.pt', size)
args = (torch.zeros(1, 64, 12), torch.tensor([1500.0]), torch.tensor([1500.0]))
torch.onnx.export(m, args, f'/tmp/m3/out/maia3-{size}.onnx', input_names=['board', 'elo_self', 'elo_oppo'], output_names=['policy', 'value'],
                  dynamic_axes={'board': {0: 'b'}, 'elo_self': {0: 'b'}, 'elo_oppo': {0: 'b'}, 'policy': {0: 'b'}, 'value': {0: 'b'}}, opset_version=17, dynamo=False)
print('exported', size)
