<template>
  <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
    <div class="clay-blob clay-blob-violet" />
    <div class="clay-blob clay-blob-pink" />
    <div class="clay-blob clay-blob-blue" />
    <div class="clay-blob clay-blob-green" />
  </div>
</template>

<style scoped>
.clay-blob {
  position: absolute;
  width: 56vh;
  height: 56vh;
  border-radius: 999px;
  filter: blur(64px);
  opacity: 0.72;
  animation: clay-float 10s ease-in-out infinite;
}

.clay-blob-violet {
  top: -16%;
  left: -10%;
  background: rgba(124, 58, 237, 0.15);
}

.clay-blob-pink {
  top: 20%;
  right: -14%;
  background: rgba(219, 39, 119, 0.12);
  animation-delay: 2s;
}

.clay-blob-blue {
  right: 18%;
  bottom: -22%;
  background: rgba(14, 165, 233, 0.12);
  animation-delay: 4s;
}

.clay-blob-green {
  bottom: 12%;
  left: 20%;
  background: rgba(16, 185, 129, 0.11);
  animation-delay: 1s;
}
</style>
