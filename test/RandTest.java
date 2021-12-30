public class RandTest {
    public static void main(String[] args){
        int numBins = 2;
        int[] bins = new int[numBins];

        int numSamples = 30000;
        for(int sample = 0; sample < numSamples; sample++){
            float r = rand(sample);

            bins[(int) Math.floor(r * numBins)]++;
        }

        for(int j = 0; j < numBins; j++){
            System.out.println("bin " + j + ": " + (((double) bins[j]) / numSamples));
        }
    }
    static int hash(int x) {
        x += ( x << 10 );
        x ^= ( x >>  6 );
        x += ( x <<  3 );
        x ^= ( x >> 11 );
        x += ( x << 15 );
        return x;
    }
    static float rand(float f) {
        final int mantissaMask = 0x007FFFFF;
        final int one          = 0x3F800000;
       
        int h = hash(Float.floatToIntBits(f));
        h &= mantissaMask;
        h |= one;
        
        float  r2 = Float.intBitsToFloat(h);
        return r2 - 1f;
    }
}
