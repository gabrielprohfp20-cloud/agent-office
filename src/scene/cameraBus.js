// Ligação simples entre o minimapa (interface) e a câmara (3D):
// - target: para onde a câmara está a olhar agora (o 3D escreve, o minimapa lê)
// - focus: ponto pedido pelo minimapa (o minimapa escreve, o 3D move a câmara até lá)
export const cameraBus = {
  target: [0.5, 0.5],
  focus: null,
}
