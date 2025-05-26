#include <iostream>
#include "RandomQuote.h"

int main()
{
    try {
        std::cout << '\n' << getRandomQuote() << '\n';
    }
    catch (const std::exception& ex) {
        std::cerr << "Error: " << ex.what() << '\n';
        return 1;
    }
}
