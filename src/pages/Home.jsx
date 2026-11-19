import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useData } from '../data.jsx';
import HeroSlider from '../components/HeroSlider.jsx';
import CurvedCarousel from '../components/CurvedCarousel.jsx';
import MemoryGrid from '../components/MemoryGrid.jsx';
import { Reveal } from '../components/bits.jsx';
import { AlbumTile } from './Albums.jsx';

export default function Home() {
  const { albums, version, openViewer, openUpload, openAlbumForm } = useData();
  const [recent, setRecent] = useState(null);

  useEffect(() => {
    api('memories?limit=40')
      .then((d) => setRecent(d.memories))
      .catch(() => setRecent([]));
  }, [version]);

  const curve = (recent || []).filter((m) => m.mediaType === 'image' || m.mediaType === 'video').slice(0, 16);

  return (
    <>
      <HeroSlider />

      <section className="section light">
        <Reveal className="center">
          <p className="eyebrow">Join the memories</p>
          <h2 className="display">Every shift, every bond</h2>
        </Reveal>
        {curve.length ? (
          <CurvedCarousel memories={curve} onOpen={(i) => openViewer(curve, i)} />
        ) : (
          recent && (
            <Reveal className="center empty">
              <p>No memories yet. Be the first to drop one.</p>
              <button className="btn btn--dark" onClick={() => openUpload()}>+ Add memory</button>
            </Reveal>
          )
        )}
        <Reveal className="center" delay={0.1}>
          <p className="lede">
            Drag the reel. Tap a photo to react, comment, or throw a GIF at it.
          </p>
        </Reveal>
      </section>

      <section className="section dark">
        <div className="section-head">
          <Reveal>
            <p className="eyebrow light">Albums</p>
            <h2 className="display">Chapters of the wave</h2>
          </Reveal>
          <div className="row">
            <Link className="btn btn--ghost" to="/albums">See all</Link>
            <button className="btn btn--accent" onClick={openAlbumForm}>+ New album</button>
          </div>
        </div>
        <div className="album-grid">
          {(albums || []).slice(0, 6).map((a, i) => (
            <AlbumTile key={a.id} album={a} index={i} />
          ))}
        </div>
      </section>

      {recent?.length > 0 && (
        <section className="section light">
          <div className="section-head">
            <Reveal>
              <p className="eyebrow">Fresh drops</p>
              <h2 className="display">Latest uploads</h2>
            </Reveal>
          </div>
          <MemoryGrid memories={recent.slice(0, 12)} showAlbum onOpen={(i) => openViewer(recent.slice(0, 12), i)} />
        </section>
      )}
    </>
  );
}
