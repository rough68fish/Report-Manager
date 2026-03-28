# Drupal 10 — built via Composer so Drush works correctly
# NOTE: First build takes 5-10 min (downloads all Drupal dependencies)
FROM php:8.2-apache

# System dependencies required by Drupal's PHP extensions
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    libzip-dev \
    libicu-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        gd \
        opcache \
        pdo \
        pdo_mysql \
        zip \
        intl \
    && rm -rf /var/lib/apt/lists/*

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Install Drupal 10 + Drush via Composer
# Uses BuildKit cache mount to speed up repeat builds
WORKDIR /var/www/html
RUN --mount=type=cache,target=/root/.composer/cache \
    composer create-project drupal/recommended-project:^10 . --no-interaction \
    && composer require drush/drush --no-interaction \
    && composer require \
        drupal/openid_connect \
        drupal/consumers \
        --no-interaction

# Apache: serve from the web/ subdirectory (recommended-project layout)
RUN a2enmod rewrite \
    && sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/web|g' \
        /etc/apache2/sites-available/000-default.conf \
    && sed -i 's|<Directory /var/www/>|<Directory /var/www/html/web/>|g' \
        /etc/apache2/apache2.conf \
    && echo '<Directory /var/www/html/web>\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' >> /etc/apache2/apache2.conf

# PHP settings
RUN echo "memory_limit = 256M"      >  /usr/local/etc/php/conf.d/drupal.ini \
    && echo "upload_max_filesize = 32M" >> /usr/local/etc/php/conf.d/drupal.ini \
    && echo "post_max_size = 32M"       >> /usr/local/etc/php/conf.d/drupal.ini
