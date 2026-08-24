// SKEL-004 spike — throwaway. Proves the Preact hydration path, then is removed.
import { useState } from 'preact/hooks';

export default function SpikeCounter() {
  const [count, setCount] = useState(0);

  return (
    <button id="spike-counter" type="button" onClick={() => setCount((c) => c + 1)}>
      Count: {count}
    </button>
  );
}
