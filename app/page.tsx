import { MapCanvas } from '../components/MapCanvas';

export default function Home() {
    return (
        <div className='w-full h-screen'>
            <MapCanvas docName='main-map' />
        </div>
    );
}
